import { JOB_TTL_MS, QUEUE_DRAIN_CONCURRENCY, QUEUE_MAX_DEPTH } from '@/lib/constants'
import { redis } from '@/lib/redis'
import { log } from '@/lib/log'
import type { JobStatus } from '@/lib/enums'

// A job queue over Redis, drained by a worker inside this process.
//
// It separates two waits. A preview holds a browser slot for as long as it takes; the reader holds
// an HTTP connection for as long as they are willing. Tying them together forces the slot wait to
// fit inside the reader's patience, and a busy moment then shows a broken button. The request
// returns the moment the job is queued and the worker waits on the slot alone.
//
// The worker lives here rather than in its own service for two reasons that are not negotiable
// today: a separate Railway service costs money, and the screenshot volume pins the app to
// `numReplicas: 1`, so "in this process" and "in this deploy" are the same statement. See
// docs/scraping.md.

/**
 * What a runner reports back. `ok: false` means the work can never succeed for this input, which the
 * queue turns into `unavailable`, a different answer from a crash and the distinction the whole
 * design exists for. `result` is whatever the route that owns the kind wants to hand its client.
 */
export type RunOutcome<T = unknown> = { ok: boolean; result?: T }

export type Job<T = unknown> = {
  status: JobStatus
  result?: T
}

const QUEUE_KEY = 'queue:jobs'

// Where a job lives while it is being run. Its whole purpose is to survive a restart: an id popped
// straight off QUEUE_KEY is gone the instant the process dies, and the analysis it names has already
// spent a credit. See `reap`.
const PROCESSING_KEY = 'queue:processing'

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
    log.error('queue.read_failed', error, { job: id })
    return null
  }
}

async function writeJob(id: string, job: Job): Promise<void> {
  const client = redis()
  if (!client) return

  try {
    await client.set(jobKey(id), JSON.stringify(job), 'PX', JOB_TTL_MS)
  } catch (error) {
    log.error('queue.write_failed', error, { job: id })
  }
}

/**
 * Puts a job on the queue and returns what the caller should tell the client. `null` means Redis is
 * unreachable and the caller must do the work inline instead. See the fail-open note below.
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

    // Depth as it was when this job arrived, which is the number that says whether the queue is
    // keeping up. Read before the push so it counts what is ahead of this job, not this job.
    log.info('queue.enqueued', { job: id, depth })

    void drain()
    return job
  } catch (error) {
    log.error('queue.enqueue_failed', error, { job: id })
    return null
  }
}

/**
 * Puts back whatever a previous process was holding when it died.
 *
 * **This version is correct only because there is exactly one process.** `.railway/railway.ts` pins
 * `numReplicas: 1` and the screenshot volume is what pins it, so anything sitting in PROCESSING_KEY
 * at startup was orphaned by definition and can be requeued on sight. The day a second replica
 * exists this becomes a bug of the worst kind, requeuing a job another replica is running right
 * now, and the fix then is a per-entry timestamp and a reaper that only takes what has been held
 * longer than any job can legitimately take. See docs/scraping.md.
 *
 * Orphans go back to the FRONT of the queue: they were accepted before anything now waiting.
 *
 * **It runs from `drain`, not at module load, and that ordering is deliberate.** `registerRunner` is
 * called at the module scope of the route that owns the work, and that route is what imports this
 * file, so at import time the runner map is still empty and a reaped job would be answered
 * `unavailable` by a worker that simply had not learned its handler yet. By the time anything calls
 * `drain` the registration has happened. The cost is that an orphan waits for the next enqueue, and
 * on this workload the next enqueue is somebody clicking Analyze.
 *
 * **It runs at the top of every drain rather than once per process, and that is safe rather than
 * wasteful.** `drain` is serial behind `queueDraining` and its `finally` releases every id it took,
 * so at the moment a drain begins this process holds nothing in the processing list, and anything
 * there still belongs to a dead one. Doing it once behind a flag would mean a single transient
 * Redis error stranded an orphan until the next deploy; on a healthy queue this costs one LMOVE that
 * answers nil.
 */
async function reap(): Promise<void> {
  const client = redis()
  if (!client) return

  try {
    let requeued = 0
    while (await client.lmove(PROCESSING_KEY, QUEUE_KEY, 'LEFT', 'LEFT')) requeued++
    if (requeued > 0) log.warn('queue.reaped', { requeued })
  } catch (error) {
    log.error('queue.reap_failed', error)
  }
}

type QueueClient = NonNullable<ReturnType<typeof redis>>

/**
 * One worker loop: takes ids until the queue is empty, runs each to a terminal answer.
 *
 * **A job in flight when the process restarts is picked back up.** The id moves to PROCESSING_KEY
 * rather than being popped off the list, comes off it in a `finally` so success and failure clean
 * up identically, and `reap` puts back whatever a dead process left behind.
 *
 * Dropping it would cost the analysis **and** the money together: `POST /api/analyses` spends a
 * credit before it enqueues, and `refundCredit` only runs when the generation throws, never when the
 * process dies under it.
 *
 * A requeued job runs its handler a second time, which is why `runAnalysis` returns early on a row
 * that already has its results. See lib/run-analysis.ts. The credit is not at risk either way: it
 * is spent by the route, not by the job.
 */
async function worker(client: QueueClient): Promise<void> {
  for (;;) {
    const id = await client.lmove(QUEUE_KEY, PROCESSING_KEY, 'LEFT', 'RIGHT')
    if (!id) break

    const startedAt = Date.now()

    try {
      const { kind } = split(id)
      const run = globalForQueue.queueRunners!.get(kind)

      if (!run) {
        // A kind nobody registered is a deploy that lost its handler, not a retryable failure.
        log.error('queue.no_runner', undefined, { kind, job: id })
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
        log.info('queue.job_finished', { job: id, ms: Date.now() - startedAt, ok: outcome.ok })
      } catch (error) {
        log.error('queue.job_failed', error, { job: id, ms: Date.now() - startedAt })
        await writeJob(id, { status: 'unavailable' })
      }
    } finally {
      // Both outcomes above are terminal answers the client can read, so the claim is released
      // either way. Only a process that dies before reaching here leaves the entry for `reap`.
      await client.lrem(PROCESSING_KEY, 1, id)
    }
  }
}

/**
 * Drains the queue with QUEUE_DRAIN_CONCURRENCY workers side by side.
 *
 * **This is not the browser cap and does not overlap with it.** `withBrowserSlot` caps how many
 * pages exist at once and is the only thing limiting Chromium; this caps how many jobs are in
 * flight. Most of an owned analysis is not holding a slot: it scrapes, releases, then spends 30-60s
 * in three Sonnet calls competing for nothing. Draining one job at a time puts the throughput
 * ceiling there rather than on the three tabs.
 *
 * A burst of scrape-heavy work waits at `withBrowserSlot`, bounded by SCRAPE_QUEUE_MAX_WAIT_MS,
 * instead of at the head of this list where nothing bounds it.
 *
 * **`queueDraining` still admits one drain at a time, and `reap` depends on that.** Reaping on
 * sight is sound only while this process holds nothing in the processing list, and it holds nothing
 * precisely because every worker releases its id in a `finally` and no second drain is running. So
 * `reap` stays where it is: before any worker starts, inside the flag.
 */
export async function drain(): Promise<void> {
  const client = redis()
  if (!client || globalForQueue.queueDraining) return

  globalForQueue.queueDraining = true

  try {
    await reap()

    await Promise.all(Array.from({ length: QUEUE_DRAIN_CONCURRENCY }, () => worker(client)))
  } finally {
    globalForQueue.queueDraining = false
  }
}

export function jobRef(id: string): string {
  return split(id).ref
}
