import type { AnalysisState } from '@/lib/enums'

/**
 * What the reader is looking at, decided in one place.
 *
 * Pure, and separate from the reads that feed it, because the order of these tests is the whole logic
 * and it is worth being able to test without a database or a Redis.
 */
export type AnalysisFacts = {
  /** The scrape landed and the measurement is stored. */
  measured: boolean
  /** Hypotheses or fixes exist. */
  generated: boolean
  /** `analyses.user_id` is set. Rows from before the quota existed may carry none. */
  owned: boolean
  /** The latest run has `failed_at`: it threw or came back empty. Durable. */
  failed: boolean
  /** The latest run's job is queued or running right now. Transient. */
  running: boolean
}

export function analysisState(facts: AnalysisFacts): AnalysisState {
  if (!facts.measured) return facts.failed ? 'failed' : 'measuring'

  // Lists on screen stay on screen while a new run replaces them, and a run that failed leaves them
  // as they were. `failed` outranks a running job, because `failed_at` is written before the queue
  // writes the job's terminal status.
  if (facts.generated) return facts.running && !facts.failed ? 'rerunning' : 'ready'

  // A row from before the quota existed was only ever measured, and nothing is coming for it.
  if (!facts.owned) return 'ready'

  if (facts.failed) return 'failed'
  if (facts.running) return 'generating'

  // Owned, measured, nothing generated, nothing recorded as failed and no job: the job was lost.
  // Nothing is coming, so the reader is told it failed rather than shown a placeholder that never
  // fills.
  return 'failed'
}
