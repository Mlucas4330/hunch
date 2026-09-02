import type { AnalysisState } from '@/lib/enums'

/**
 * What the reader is looking at, decided in one place.
 *
 * Pure, and separate from the two reads that feed it, because the order of these tests is the whole
 * logic and it is worth being able to test without a database or a Redis. Every surface that used to
 * derive its own answer from `measured` / `generated` / ownership is a chance for two screens to
 * disagree about the same row -- which has already happened once in this product, back when the
 * report was two routes.
 */
export type AnalysisFacts = {
  /** The scrape landed and the readout is stored. */
  measured: boolean
  /** Hypotheses or fixes exist. */
  generated: boolean
  /** `analyses.user_id` is set, which is the whole of "somebody paid for the generated half". */
  owned: boolean
  /** A job for this analysis is queued or running right now. Transient: the job outlives nothing. */
  running: boolean
  /** A refund is recorded against this analysis in the ledger. Durable, and see the note below. */
  refunded: boolean
}

export function analysisState(facts: AnalysisFacts): AnalysisState {
  // Ordered by how much each test settles, and every early answer is free of I/O -- see
  // `analysisStateFor`, which only pays for `running` and `refunded` once it reaches the ambiguous
  // middle.
  if (!facts.measured) return 'measuring'
  if (facts.generated) return 'ready'

  // **Ownership before anything about the job, and this line is load bearing.** An anonymous run's
  // job is briefly still `running` after the measurement is committed, and the form navigates the
  // reader here the moment it is. Asking the job first would show a stranger four placeholders for
  // fixes nobody bought and nothing will ever write.
  if (!facts.owned) return 'locked'

  // **A refund outranks a running job**, because the two can be true at once: `refundCredit` commits
  // before `runAnalysis` rethrows, and the queue only writes the job's terminal status afterwards.
  // Read the other way round, a failed analysis would show as generating for as long as that gap and
  // for the whole of any retry.
  if (facts.refunded) return 'failed'
  if (facts.running) return 'generating'

  // Owned, measured, nothing generated, nothing running, nothing refunded: a free run that was
  // claimed after signing in. Nobody ever bought the generated half, so there is nothing coming.
  return 'locked'
}
