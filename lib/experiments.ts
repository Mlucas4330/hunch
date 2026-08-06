import { sql, type SQL } from 'drizzle-orm'
import { experiments, type Experiment, type ExperimentStat } from '@/db/schema'
import type { ExperimentArm } from '@/lib/enums'
import { experimentResult, type ExperimentResult } from '@/lib/stats'

export type ExperimentWithResult = Experiment & { result: ExperimentResult }

// When a running test is actually over, in DB time. `ends_at` is nullable, and `ends_at <= now()` on
// a null is null, not false -- so a row missing it would never be finalized and would keep rewriting
// the customer's page forever. Falling back to the started_at + duration_days the row already
// carries is what closes that. One definition, shared by the cron that ends a test and the config
// route that serves it, because the two disagreeing means a test that is over but still live.
function effectiveEnd(): SQL {
  return sql`coalesce(${experiments.endsAt}, ${experiments.startedAt} + ${experiments.durationDays} * interval '1 day')`
}

export function experimentIsOver(): SQL {
  return sql`${effectiveEnd()} <= now()`
}

export function experimentIsLive(): SQL {
  return sql`${effectiveEnd()} > now()`
}

function counts(stats: ExperimentStat[], arm: ExperimentArm) {
  const row = stats.find((s) => s.arm === arm)
  return { impressions: row?.impressions ?? 0, conversions: row?.conversions ?? 0 }
}

export function experimentWithResult(
  experiment: Experiment,
  stats: ExperimentStat[]
): ExperimentWithResult {
  return {
    ...experiment,
    result: experimentResult({
      control: counts(stats, 'control'),
      variant: counts(stats, 'variant')
    })
  }
}
