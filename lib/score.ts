import { READOUT_SCORE_THRESHOLDS, READOUT_SEVERITY_POINTS } from '@/lib/constants'
import { READOUT_GROUP, type ReadoutGroup, type ReadoutSeverity } from '@/lib/enums'
import type { MeasuredFinding } from '@/lib/readout'

export type ReadoutScore = {
  overall: number | null
  groups: Record<ReadoutGroup, number | null>
}

function scoreOf(findings: MeasuredFinding[]): number | null {
  if (findings.length === 0) return null

  const points = findings.reduce(
    (total, finding) => total + READOUT_SEVERITY_POINTS[finding.severity],
    0
  )

  return Math.round((points / findings.length) * 100)
}

export function readoutScore(findings: MeasuredFinding[]): ReadoutScore {
  const groups = Object.fromEntries(
    READOUT_GROUP.map((group) => [group, scoreOf(findings.filter((f) => f.group === group))])
  ) as Record<ReadoutGroup, number | null>

  return { overall: scoreOf(findings), groups }
}

export function scoreSeverity(score: number): ReadoutSeverity {
  if (score <= READOUT_SCORE_THRESHOLDS.alertAtOrBelow) return 'alert'
  return score <= READOUT_SCORE_THRESHOLDS.warnAtOrBelow ? 'warn' : 'ok'
}
