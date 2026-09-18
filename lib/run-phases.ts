import type { RunPhase, RunStep } from '@/lib/enums'

/**
 * The waiting screen's four lines, derived from the eight steps a run records.
 *
 * Pure, and in its own file for the reason `lib/quota-math.ts` is: a test for the grouping must not
 * have to reach a Redis. The reading and writing live in lib/run-progress.ts.
 */

/**
 * Which steps each line of the waiting screen is made of.
 *
 * `assemble` has no step of its own on purpose: the run's last act is one transaction that replaces
 * the lists, and the thing that says it happened is the analysis becoming `ready`. Giving it a step
 * would mean writing "done" from inside the work that is not done yet.
 */
export const PHASE_STEPS: Record<RunPhase, readonly RunStep[]> = {
  open: ['open'],
  measure: ['pagespeed', 'crawl', 'index', 'snapshot'],
  write: ['copy', 'flow', 'visibility'],
  assemble: []
}

export type PhaseState = 'done' | 'active' | 'waiting'

/**
 * The four lines, from the steps that landed plus the coarse state the rows already prove.
 *
 * **`measured` and `generated` outrank the step list**, because they are read from the database while
 * the steps are read from a cache that is allowed to be empty. With no Redis the screen still moves:
 * the lines advance twice instead of eight times.
 */
export function phasesFor({
  steps,
  measured,
  generated
}: {
  steps: readonly RunStep[]
  measured: boolean
  generated: boolean
}): Record<RunPhase, PhaseState> {
  const done = (phase: RunPhase) =>
    PHASE_STEPS[phase].length > 0 && PHASE_STEPS[phase].every((step) => steps.includes(step))

  const state: Record<RunPhase, PhaseState> = {
    open: done('open') || measured ? 'done' : 'active',
    measure: measured ? 'done' : 'waiting',
    write: generated ? 'done' : 'waiting',
    assemble: generated ? 'active' : 'waiting'
  }

  if (state.open === 'active') return state

  // Measuring is three calls side by side, so "in progress" is anything between the first landing and
  // the snapshot being written.
  if (!measured) {
    state.measure = 'active'
    return state
  }

  if (!generated) state.write = 'active'

  return state
}
