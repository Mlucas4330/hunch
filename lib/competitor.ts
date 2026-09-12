import { measuredFindings, type MeasuredFinding, type ReadoutInput } from '@/lib/readout'
import type { PageKeywords } from '@/lib/keywords'
import type { BacklinkSummary, RankedKeywords } from '@/lib/seranking'
import type { PageSpeed } from '@/lib/pagespeed'
import type { PageMobile, PagePerformance, PageSeo, PageStructure } from '@/lib/scrape'
import type { Market, ReadoutFinding } from '@/lib/enums'

// Pure, and every import above is type-only: this module is imported by a client component, so a
// value import from lib/scrape would pull puppeteer into the browser bundle. The scrape half lives in
// lib/analyze.ts.

/**
 * A second page the reader named, measured by the same code as the first and by PageSpeed Insights.
 * No `crawlerAccess`: fetching somebody else's robots.txt compares nothing worth comparing.
 */
export type CompetitorMeasurement = {
  url: string
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
  keywords: PageKeywords
  mobile: PageMobile
  // Absent on rows measured before PageSpeed Insights replaced the readout.
  pagespeed?: PageSpeed | null
  // Asked on the reader's market, so both domains are compared on the same Google. Absent on rows
  // measured before SE Ranking was read.
  backlinks?: BacklinkSummary | null
  rankedKeywords?: RankedKeywords | null
}

// The competitor's page read as a readout, so a prompt compares through one implementation of what a
// finding is.
export function competitorInput(
  competitor: CompetitorMeasurement,
  market: Market | null
): ReadoutInput {
  return {
    structure: competitor.structure,
    seo: competitor.seo,
    performance: competitor.performance,
    keywords: competitor.keywords,
    mobile: competitor.mobile,
    crawler: null,
    sameness: null,
    site: null,
    backlinks: competitor.backlinks ?? null,
    rankedKeywords: competitor.rankedKeywords ?? null,
    market
  }
}

/**
 * The other page's value for each finding, keyed by id. A finding present on one side and absent from
 * the other is left out rather than compared against zero.
 */
export function competitorValues(
  competitor: ReadoutInput,
  mine: MeasuredFinding[]
): Map<ReadoutFinding, MeasuredFinding> {
  const ours = new Set(mine.map((finding) => finding.id))
  const out = new Map<ReadoutFinding, MeasuredFinding>()

  for (const finding of measuredFindings(competitor)) {
    if (ours.has(finding.id)) out.set(finding.id, finding)
  }

  return out
}
