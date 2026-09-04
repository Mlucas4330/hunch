import { measuredFindings, type MeasuredFinding, type ReadoutInput } from '@/lib/readout'
import { readoutScore } from '@/lib/score'
import type { Market, ReadoutFinding } from '@/lib/enums'
import type { CrawlerAccess } from '@/lib/robots'
import type { PageKeywords } from '@/lib/keywords'
import type { PageMobile, PagePerformance, PageSameness, PageSeo, PageStructure } from '@/lib/scrape'

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
  sameness: PageSameness
}

type SnapshotColumns = {
  structure: PageStructure | null
  seo: PageSeo | null
  performance: PagePerformance | null
  crawlerAccess: CrawlerAccess | null
  keywords: PageKeywords | null
  mobile: PageMobile | null
  sameness: PageSameness | null
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
    sameness: snapshot.sameness,
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
    sameness: measurement.sameness,
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
