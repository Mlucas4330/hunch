import { sql, type SQL } from 'drizzle-orm'
import { experiments, type Experiment, type ExperimentStat } from '@/db/schema'
import type { ExperimentArm } from '@/lib/enums'
import { experimentResult, type ExperimentResult } from '@/lib/stats'

export type ExperimentWithResult = Experiment & { result: ExperimentResult }

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
