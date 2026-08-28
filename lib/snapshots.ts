import { measuredFindings, type MeasuredFinding, type ReadoutInput } from '@/lib/readout'
import { readoutScore } from '@/lib/score'
import { REGRESSION_SCORE_DROP } from '@/lib/constants'
import { READOUT_SEVERITY, type Market, type ReadoutFinding } from '@/lib/enums'
import type { CrawlerAccess } from '@/lib/robots'
import type { PageKeywords } from '@/lib/keywords'
import type { PageMobile, PagePerformance, PageSeo, PageStructure } from '@/lib/scrape'

// Pure by necessity as much as by taste: `deltas` runs inside MeasuredReadout, a client component,
// so nothing here may reach for the database or the browser. The queries live in lib/analyses.ts.

export type ScorePoint = { score: number; capturedAt: Date }

export type ReadoutHistory = {
  previous: ReadoutInput | null
  scores: ScorePoint[]
}

export const EMPTY_HISTORY: ReadoutHistory = { previous: null, scores: [] }

// The measured facts, in the shape both `analyses` and `page_snapshots` hold them.
export type MeasuredColumns = {
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
  crawlerAccess: CrawlerAccess
  keywords: PageKeywords
  mobile: PageMobile
}

type SnapshotColumns = {
  structure: PageStructure | null
  seo: PageSeo | null
  performance: PagePerformance | null
  crawlerAccess: CrawlerAccess | null
  keywords: PageKeywords | null
  mobile: PageMobile | null
}

// A snapshot holds the same measured facts as the analysis row, so it reads as one too.
//
// **`market` is passed in rather than stored on the snapshot.** It is pinned to `analyses.market` at
// creation and never moves, so a snapshot carrying its own copy would be a second source of truth
// for one fact. One finding reads it, and it reads it to stay quiet outside Brazil.
export function snapshotInput(snapshot: SnapshotColumns, market: Market | null): ReadoutInput {
  return {
    structure: snapshot.structure,
    seo: snapshot.seo,
    performance: snapshot.performance,
    crawler: snapshot.crawlerAccess,
    keywords: snapshot.keywords,
    mobile: snapshot.mobile,
    market
  }
}

export function snapshotValues(
  analysisId: string,
  measurement: MeasuredColumns,
  market: Market
) {
  return {
    analysisId,
    structure: measurement.structure,
    seo: measurement.seo,
    performance: measurement.performance,
    crawlerAccess: measurement.crawlerAccess,
    keywords: measurement.keywords,
    mobile: measurement.mobile,
    // Frozen here so a later threshold change never rewrites what the trend already showed.
    score: readoutScore(measuredFindings(snapshotInput(measurement, market))).overall
  }
}

// Arithmetic between two measurements of the same page, and nothing more: a delta says the number
// moved, never that anything caused it to. See docs/invariants.md.
export function deltas(
  current: ReadoutInput,
  previous: ReadoutInput | null
): Map<ReadoutFinding, number> {
  const out = new Map<ReadoutFinding, number>()
  if (!previous) return out

  const before = new Map<ReadoutFinding, MeasuredFinding>(
    measuredFindings(previous).map((finding) => [finding.id, finding])
  )

  for (const finding of measuredFindings(current)) {
    const was = before.get(finding.id)
    if (!was || was.value === finding.value) continue

    out.set(finding.id, finding.value - was.value)
  }

  return out
}

/**
 * What got **worse** between two measurements.
 *
 * Same arithmetic discipline as `deltas` and the same rule about what may be said of it: this reports
 * that a number moved in the bad direction, never that anything caused it to. See docs/invariants.md.
 *
 * **It exists because "something changed" is not worth interrupting anyone for.** The weekly mail
 * used to fire on any delta, which meant a week where two numbers drifted by network noise read the
 * same as a week where the form doubled in length -- and a notification that cries wolf weekly is one
 * people filter. Only a regression is worth a push; an improvement is worth seeing on the report when
 * the reader next opens it.
 *
 * Two independent signals, because they catch different failures:
 *
 * - **A severity crossing.** `READOUT_SEVERITY` is ordered by badness, so a finding that moves to a
 *   higher index has crossed a threshold somebody set on purpose. This catches the sharp ones.
 * - **A score drop past `REGRESSION_SCORE_DROP`.** A page can pick up a dozen half-point warns
 *   without any single one crossing, and that is a real decline nothing above would report.
 */
export type Regression = {
  worsened: MeasuredFinding[]
  scoreDrop: number
}

export function regressions(current: ReadoutInput, previous: ReadoutInput | null): Regression {
  if (!previous) return { worsened: [], scoreDrop: 0 }

  const currentFindings = measuredFindings(current)
  const before = new Map<ReadoutFinding, MeasuredFinding>(
    measuredFindings(previous).map((finding) => [finding.id, finding])
  )

  const worsened = currentFindings.filter((finding) => {
    const was = before.get(finding.id)
    if (!was) return false

    return READOUT_SEVERITY.indexOf(finding.severity) > READOUT_SEVERITY.indexOf(was.severity)
  })

  // Null when a side has no findings at all, which is not a drop -- it is nothing to compare.
  const now = readoutScore(currentFindings).overall
  const then = readoutScore(measuredFindings(previous)).overall
  const scoreDrop = now !== null && then !== null ? Math.max(0, then - now) : 0

  return { worsened, scoreDrop }
}

/**
 * Whether a regression is worth sending a message about.
 *
 * One place, so the mail and anything else that ever notifies cannot drift into two definitions of
 * "got worse".
 */
export function isWorthReporting(regression: Regression): boolean {
  return regression.worsened.length > 0 || regression.scoreDrop >= REGRESSION_SCORE_DROP
}
