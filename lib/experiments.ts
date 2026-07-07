import type { Experiment, ExperimentStat } from '@/db/schema'
import type { ExperimentArm } from '@/lib/enums'
import { experimentResult, type ExperimentResult } from '@/lib/stats'

export type ExperimentWithResult = Experiment & { result: ExperimentResult }

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
