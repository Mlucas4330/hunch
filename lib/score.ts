import { READOUT_SCORE_THRESHOLDS, READOUT_SEVERITY_POINTS } from '@/lib/constants'
import {
  READOUT_GROUP,
  UNSCORED_READOUT_GROUP,
  type ReadoutGroup,
  type ReadoutSeverity
} from '@/lib/enums'
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

/**
 * The score, and the groups that are deliberately outside it.
 *
 * **An unscored group is `null` in `groups` and absent from `overall`, and both halves matter.**
 * Leaving `sameness` in `overall` would say that looking like other pages costs conversion, which is
 * a causal claim nobody measured. Leaving it scored in `groups` would print a `/100` rail beside a
 * list of design choices, which reads as a grade even with no wording attached to it.
 *
 * The consequence lives in `components/measured-readout.tsx`: its group card returns null when the
 * score is null, so an unscored group needs the card to render without a rail. See docs/readout.md.
 */
export function readoutScore(findings: MeasuredFinding[]): ReadoutScore {
  const scored = findings.filter((f) => !UNSCORED_READOUT_GROUP.includes(f.group))

  const groups = Object.fromEntries(
    READOUT_GROUP.map((group) => [
      group,
      UNSCORED_READOUT_GROUP.includes(group)
        ? null
        : scoreOf(findings.filter((f) => f.group === group))
    ])
  ) as Record<ReadoutGroup, number | null>

  return { overall: scoreOf(scored), groups }
}

export function scoreSeverity(score: number): ReadoutSeverity {
  if (score <= READOUT_SCORE_THRESHOLDS.alertAtOrBelow) return 'alert'
  return score <= READOUT_SCORE_THRESHOLDS.warnAtOrBelow ? 'warn' : 'ok'
}
