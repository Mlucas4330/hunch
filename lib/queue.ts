import { JOB_TTL_MS, QUEUE_MAX_DEPTH } from '@/lib/constants'
import { redis } from '@/lib/redis'
import type { JobStatus } from '@/lib/enums'

// A job queue over Redis, drained by a worker inside this process.
//
// The point is to separate two waits that used to be the same one. A preview holds a browser slot
// for as long as it takes; the reader holds an HTTP connection for as long as they are willing.
// Tying them together meant the slot wait had to fit inside the reader's patience, which is why
// `screenshotVariant` gave up after five seconds and a busy moment showed a broken button. Now the
// request returns the moment the job is queued and the worker waits on the slot alone.
//
// The worker lives here rather than in its own service for two reasons that are not negotiable
// today: a separate Railway service costs money, and the screenshot volume pins the app to
// `numReplicas: 1`, so "in this process" and "in this deploy" are the same statement. See
// docs/scraping.md.

/**
 * What a runner reports back. `ok: false` means the work can never succeed for this input, which the
 * queue turns into `unavailable` — a different answer from a crash, and the distinction the whole
 * design exists for. `result` is whatever the route that owns the kind wants to hand its client.
 */
export type RunOutcome<T = unknown> = { ok: boolean; result?: T }

export type Job<T = unknown> = {
  status: JobStatus
  result?: T
}

const QUEUE_KEY = 'queue:jobs'
const jobKey = (id: string) => `job:${id}`

// Every job runner the worker knows how to run, registered by the route that owns the work. The
// queue holds no domain knowledge: it moves ids and statuses, and the handler does the rest.
type Runner = (id: string) => Promise<RunOutcome>

const globalForQueue = globalForQueueInit()

function globalForQueueInit() {
  const g = globalThis as unknown as {
    queueRunners?: Map<string, Runner>
    queueDraining?: boolean
  }
  g.queueRunners ??= new Map()
  return g
}

export function registerRunner(kind: string, run: Runner): void {
  globalForQueue.queueRunners!.set(kind, run)
}

function split(id: string): { kind: string; ref: string } {
  const at = id.indexOf(':')
  return { kind: id.slice(0, at), ref: id.slice(at + 1) }
}

/**
 * The id is `<kind>:<ref>` and the ref is the thing the work is about, never a random token.
 * Two readers asking for the same preview therefore share one job instead of racing to render the
 * same variant twice and leaving one file orphaned. See docs/report.md.
 */
export function jobId(kind: string, ref: string): string {
  return `${kind}:${ref}`
}

export async function readJob<T = unknown>(id: string): Promise<Job<T> | null> {
  const client = redis()
  if (!client) return null

  try {
    const raw = await client.get(jobKey(id))
    return raw ? (JSON.parse(raw) as Job<T>) : null
  } catch (error) {
    console.error('[queue] read failed', error)
    return null
  }
}

async function writeJob(id: string, job: Job): Promise<void> {
  const client = redis()
  if (!client) return

  try {
    await client.set(jobKey(id), JSON.stringify(job), 'PX', JOB_TTL_MS)
  } catch (error) {
    console.error('[queue] write failed', error)
  }
}

/**
 * Puts a job on the queue and returns what the caller should tell the client. `null` means Redis is
 * unreachable and the caller must do the work inline instead — see the fail-open note below.
 */
export async function enqueue(id: string): Promise<Job | null> {
  const client = redis()
  if (!client) return null

  try {
    const existing = await readJob(id)
    if (existing) return existing

    // The cap is checked before the push, so the queue answers honestly rather than accepting work
    // it will not reach. `unavailable` is the right answer here: for this caller, right now, the
    // work genuinely cannot happen.
    const depth = await client.llen(QUEUE_KEY)
    if (depth >= QUEUE_MAX_DEPTH) return { status: 'unavailable' }

    const job: Job = { status: 'queued' }
    await writeJob(id, job)
    await client.rpush(QUEUE_KEY, id)

    void drain()
    return job
  } catch (error) {
    console.error('[queue] enqueue failed', error)
    return null
  }
}

/**
 * Drains the queue one job at a time. Serial on purpose: `withBrowserSlot` already caps how many
 * pages exist at once, and a second limiter here would either fight it or hide it.
 *
 * **A job in flight when the process restarts is lost.** It was popped off the list before it ran,
 * so nothing picks it up: the client polls a `running` job until its TTL lapses, then reads
 * `unavailable` and can ask again. That is deliberate for this workload — the work is idempotent and
 * cheap to redo, and the alternative (a processing list plus a reaper) is machinery for a guarantee
 * a screenshot does not need. It stops being acceptable the moment a job spends a credit.
 */
export async function drain(): Promise<void> {
  const client = redis()
  if (!client || globalForQueue.queueDraining) return

  globalForQueue.queueDraining = true

  try {
    for (;;) {
      const id = await client.lpop(QUEUE_KEY)
      if (!id) break

      const { kind } = split(id)
      const run = globalForQueue.queueRunners!.get(kind)

      if (!run) {
        // A kind nobody registered is a deploy that lost its handler, not a retryable failure.
        console.error('[queue] no runner for kind', kind)
        await writeJob(id, { status: 'unavailable' })
        continue
      }

      await writeJob(id, { status: 'running' })

      try {
        const outcome = await run(id)
        await writeJob(
          id,
          outcome.ok ? { status: 'ready', result: outcome.result } : { status: 'unavailable' }
        )
      } catch (error) {
        console.error('[queue] job failed', id, error)
        await writeJob(id, { status: 'unavailable' })
      }
    }
  } finally {
    globalForQueue.queueDraining = false
  }
}

export function jobRef(id: string): string {
  return split(id).ref
}
