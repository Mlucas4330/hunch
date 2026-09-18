import { JOB_TTL_MS } from '@/lib/constants'
import { RUN_STEP, type RunStep } from '@/lib/enums'
import { log } from '@/lib/log'
import { redis } from '@/lib/redis'

/**
 * What a run has already finished, for the screen somebody is waiting on.
 *
 * **It is a record of the past, never a schedule.** A step is written after the call it names
 * returned, so the screen can say "PageSpeed measured" only once Google answered. A call that failed
 * writes nothing and stays pending until the run ends, which is the honest reading: we did not
 * measure it.
 *
 * **It lives beside the queue rather than inside the job record.** `lib/queue.ts` moves ids and
 * statuses and holds no domain knowledge; a list of analysis steps is exactly the knowledge it
 * refuses to hold. See docs/scraping.md.
 *
 * **It fails open, like the rate limit.** No Redis, a wrong URL or a timeout means no steps at all,
 * and the screen falls back to the two coarse phases `analysis_runs` timestamps already give it. A
 * deploy with a sick Redis loses the detail of the waiting screen and nothing else.
 */

const progressKey = (runId: string) => `progress:${runId}`

export async function markStep(runId: string, step: RunStep): Promise<void> {
  const client = redis()
  if (!client) return

  try {
    await client.sadd(progressKey(runId), step)
    // The same window the job lives in: a run whose job has expired is one nothing is waiting on.
    await client.pexpire(progressKey(runId), JOB_TTL_MS)
  } catch (error) {
    log.warn('progress.write_failed', { run: runId, step, error: String(error) })
  }
}

export async function readSteps(runId: string): Promise<RunStep[]> {
  const client = redis()
  if (!client) return []

  try {
    const members = await client.smembers(progressKey(runId))
    // Filtered against the enum rather than cast: a key left behind by an older deploy must not put a
    // step on the screen that this one has no label for.
    return RUN_STEP.filter((step) => members.includes(step))
  } catch (error) {
    log.warn('progress.read_failed', { run: runId, error: String(error) })
    return []
  }
}
