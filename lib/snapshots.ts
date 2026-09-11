import { pageSpeedScore, type PageSpeed } from '@/lib/pagespeed'
import { PAGESPEED_CATEGORY, type PageSpeedCategory } from '@/lib/enums'
import type { CrawlerAccess } from '@/lib/robots'
import type { PageKeywords } from '@/lib/keywords'
import type { PageMobile, PagePerformance, PageSameness, PageSeo, PageStructure } from '@/lib/scrape'

// Pure by necessity: `deltas` runs inside MeasuredReadout, a client component, so nothing here may
// reach for the database or the browser. The queries live in lib/analyses.ts.

export type ScorePoint = { score: number; capturedAt: Date }

export type ReadoutHistory = {
  previous: PageSpeed | null
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
  pagespeed: PageSpeed | null
}

export function snapshotValues(analysisId: string, measurement: MeasuredColumns) {
  return {
    analysisId,
    structure: measurement.structure,
    seo: measurement.seo,
    performance: measurement.performance,
    crawlerAccess: measurement.crawlerAccess,
    keywords: measurement.keywords,
    mobile: measurement.mobile,
    sameness: measurement.sameness,
    pagespeed: measurement.pagespeed,
    // Frozen here so a later change to how the score is computed never rewrites the trend.
    score: pageSpeedScore(measurement.pagespeed)
  }
}

// How each PageSpeed category score moved between two measurements of the same page. A category that
// was not scored on both sides is left out rather than compared against zero.
export function deltas(
  current: PageSpeed | null,
  previous: PageSpeed | null
): Map<PageSpeedCategory, number> {
  const out = new Map<PageSpeedCategory, number>()
  if (!current || !previous) return out

  for (const category of PAGESPEED_CATEGORY) {
    const now = current.categories[category]
    const was = previous.categories[category]
    if (now === null || was === null || now === was) continue
    out.set(category, now - was)
  }

  return out
}
