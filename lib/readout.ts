import { READOUT_THRESHOLDS } from '@/lib/constants'
import type {
  ReadoutComparison,
  ReadoutFinding,
  ReadoutGroup,
  ReadoutSeverity,
  ReadoutUnit
} from '@/lib/enums'
import type {
  CompetitorStructure,
  PagePerformance,
  PageSeo,
  PageStructure
} from '@/lib/scrape'
import type { CrawlerAccess } from '@/lib/robots'
import type { PageKeywords } from '@/lib/keywords'

export type MeasuredFinding = {
  id: ReadoutFinding
  group: ReadoutGroup
  severity: ReadoutSeverity
  value: number
  unit: ReadoutUnit
}

export type ComparisonValue = number | boolean

export type ComparisonRow = {
  metric: ReadoutComparison
  unit: ReadoutUnit
  self: ComparisonValue
  competitors: { name: string; value: ComparisonValue }[]
}

export type ReadoutInput = {
  structure: PageStructure | null
  seo: PageSeo | null
  performance: PagePerformance | null
  crawler: CrawlerAccess | null
  keywords: PageKeywords | null
  competitors: CompetitorStructure[] | null
}

export type Readout = {
  findings: MeasuredFinding[]
  comparison: ComparisonRow[]
}

function rank(value: number, warn: number, alert?: number): ReadoutSeverity {
  if (alert !== undefined && value >= alert) return 'alert'
  return value >= warn ? 'warn' : 'ok'
}

// The mirror of `rank`, for the metrics where too little is the problem. Boundaries stay inclusive
// in the same direction: landing exactly on the threshold is already the bad side.
function rankBelow(value: number, warn: number, alert?: number): ReadoutSeverity {
  if (alert !== undefined && value <= alert) return 'alert'
  return value <= warn ? 'warn' : 'ok'
}

function count(
  id: ReadoutFinding,
  group: ReadoutGroup,
  value: number,
  severity: ReadoutSeverity
): MeasuredFinding {
  return { id, group, severity, value, unit: 'count' }
}

function presence(
  id: ReadoutFinding,
  group: ReadoutGroup,
  present: boolean
): MeasuredFinding {
  return { id, group, severity: present ? 'ok' : 'warn', value: present ? 1 : 0, unit: 'presence' }
}

export function measuredFindings(input: ReadoutInput): MeasuredFinding[] {
  const { structure, seo, performance, crawler, keywords } = input
  const out: MeasuredFinding[] = []

  if (structure) {
    if (structure.formCount > 0) {
      out.push(
        count(
          'form_fields',
          'structure',
          structure.formFieldCount,
          rank(
            structure.formFieldCount,
            READOUT_THRESHOLDS.formFieldsWarn,
            READOUT_THRESHOLDS.formFieldsAlert
          )
        )
      )
      out.push(presence('no_social_signin', 'structure', structure.hasOauth))
    }

    out.push(
      count(
        'above_fold_ctas',
        'structure',
        structure.aboveFoldCtaCount,
        structure.aboveFoldCtaCount === 0
          ? 'alert'
          : rank(structure.aboveFoldCtaCount, READOUT_THRESHOLDS.aboveFoldCtasWarn)
      )
    )

    out.push(
      count(
        'nav_links',
        'structure',
        structure.navLinkCount,
        rank(
          structure.navLinkCount,
          READOUT_THRESHOLDS.navLinksWarn,
          READOUT_THRESHOLDS.navLinksAlert
        )
      )
    )

    out.push(presence('no_faq', 'structure', structure.hasFaq))
    out.push(presence('no_testimonials', 'structure', structure.hasTestimonials))

    out.push(
      count(
        'word_count',
        'structure',
        structure.wordCount,
        rankBelow(
          structure.wordCount,
          READOUT_THRESHOLDS.wordCountWarn,
          READOUT_THRESHOLDS.wordCountAlert
        )
      )
    )

    out.push(
      count(
        'heading_count',
        'structure',
        structure.headingCount,
        rankBelow(structure.headingCount, READOUT_THRESHOLDS.headingCountWarn)
      )
    )
  }

  if (seo) {
    if (seo.robotsMeta?.toLowerCase().includes('noindex')) {
      out.push({ id: 'noindex', group: 'metadata', severity: 'alert', value: 1, unit: 'presence' })
    }

    out.push(presence('no_meta_description', 'metadata', seo.metaDescription !== null))
    out.push(count('h1_count', 'metadata', seo.h1Count, seo.h1Count === 1 ? 'ok' : 'warn'))
    out.push(
      count(
        'images_missing_alt',
        'metadata',
        seo.imagesMissingAlt,
        seo.imagesMissingAlt > 0 ? 'warn' : 'ok'
      )
    )
    out.push(presence('no_structured_data', 'metadata', seo.jsonLdTypes.length > 0))
    out.push(presence('no_og_image', 'metadata', seo.hasOgImage))
    out.push(presence('no_canonical', 'metadata', seo.canonical !== null))
    out.push(presence('no_lang', 'metadata', seo.lang !== null))
    out.push(
      count(
        'internal_links',
        'metadata',
        seo.internalLinkCount,
        rankBelow(seo.internalLinkCount, READOUT_THRESHOLDS.internalLinksWarn)
      )
    )
  }

  // Where the page's most repeated term already appears. A page with nothing to read has no leading
  // term, and three warns about a term that does not exist would be an accusation about nothing.
  const leadTerm = keywords?.terms[0]
  if (leadTerm) {
    out.push(presence('term_in_title', 'metadata', leadTerm.inTitle))
    out.push(presence('term_in_h1', 'metadata', leadTerm.inH1))
    out.push(presence('term_in_meta_description', 'metadata', leadTerm.inMetaDescription))
  }

  // An unreadable robots.txt is not a permissive one. The whole group is skipped rather than
  // reporting a network failure as an open door -- or as a closed one.
  if (crawler && crawler.status !== 'unknown') {
    out.push(
      count(
        'ai_crawlers_blocked',
        'visibility',
        crawler.blockedAgents.length,
        crawler.blockedAgents.length > 0 ? 'alert' : 'ok'
      )
    )

    out.push({
      id: 'robots_blocks_all',
      group: 'visibility',
      severity: crawler.blocksAll ? 'alert' : 'ok',
      value: crawler.blocksAll ? 0 : 1,
      unit: 'presence'
    })

    out.push(presence('no_sitemap', 'visibility', crawler.sitemaps.length > 0))
  }

  if (performance) {
    if (performance.ttfbMs !== null) {
      out.push({
        id: 'ttfb',
        group: 'load',
        severity: rank(
          performance.ttfbMs,
          READOUT_THRESHOLDS.ttfbWarnMs,
          READOUT_THRESHOLDS.ttfbAlertMs
        ),
        value: performance.ttfbMs,
        unit: 'seconds'
      })
    }

    if (performance.fcpMs !== null) {
      out.push({
        id: 'fcp',
        group: 'load',
        severity: rank(
          performance.fcpMs,
          READOUT_THRESHOLDS.fcpWarnMs,
          READOUT_THRESHOLDS.fcpAlertMs
        ),
        value: performance.fcpMs,
        unit: 'seconds'
      })
    }

    if (performance.lcpMs !== null) {
      out.push({
        id: 'lcp',
        group: 'load',
        severity: rank(
          performance.lcpMs,
          READOUT_THRESHOLDS.lcpWarnMs,
          READOUT_THRESHOLDS.lcpAlertMs
        ),
        value: performance.lcpMs,
        unit: 'seconds'
      })
    }

    if (performance.transferredBytes !== null) {
      out.push({
        id: 'page_weight',
        group: 'load',
        severity: rank(
          performance.transferredBytes,
          READOUT_THRESHOLDS.pageWeightWarnBytes,
          READOUT_THRESHOLDS.pageWeightAlertBytes
        ),
        value: performance.transferredBytes,
        unit: 'megabytes'
      })
    }

    out.push(
      count(
        'request_count',
        'load',
        performance.requestCount,
        rank(
          performance.requestCount,
          READOUT_THRESHOLDS.requestCountWarn,
          READOUT_THRESHOLDS.requestCountAlert
        )
      )
    )
  }

  return out
}

// What a row needs from one page. `seo` and `performance` are optional on a competitor scraped
// before they were kept, which is exactly when a row has to disappear rather than default.
type ComparisonPage = {
  structure: PageStructure
  seo: PageSeo | null | undefined
  performance: PagePerformance | null | undefined
}

type ComparisonRead = (page: ComparisonPage) => ComparisonValue | null

export function comparisonRows(input: ReadoutInput): ComparisonRow[] {
  const { structure, seo, performance, competitors } = input
  if (!structure || !competitors?.length) return []

  const self: ComparisonPage = { structure, seo, performance }
  const rivals = competitors.map((competitor) => ({
    name: competitor.name,
    page: {
      structure: competitor.structure,
      seo: competitor.seo,
      performance: competitor.performance
    }
  }))

  const row = (
    metric: ReadoutComparison,
    unit: ReadoutUnit,
    read: ComparisonRead
  ): ComparisonRow | null => {
    const mine = read(self)
    if (mine === null) return null

    const theirs: ComparisonRow['competitors'] = []
    for (const rival of rivals) {
      const value = read(rival.page)
      // One page that cannot answer takes the whole row: a blank cell in a comparison reads as a
      // zero, and half a comparison is worse than none.
      if (value === null) return null
      theirs.push({ name: rival.name, value })
    }

    return { metric, unit, self: mine, competitors: theirs }
  }

  return [
    row('form_fields', 'count', (p) => p.structure.formFieldCount),
    row('social_signin', 'presence', (p) => p.structure.hasOauth),
    row('above_fold_ctas', 'count', (p) => p.structure.aboveFoldCtaCount),
    row('nav_links', 'count', (p) => p.structure.navLinkCount),
    row('word_count', 'count', (p) => p.structure.wordCount),
    row('pricing', 'presence', (p) => p.structure.hasPricing),
    row('testimonials', 'presence', (p) => p.structure.hasTestimonials),
    row('faq', 'presence', (p) => p.structure.hasFaq),
    row('sticky_cta', 'presence', (p) => p.structure.hasStickyCta),
    row('meta_description', 'presence', (p) =>
      p.seo ? p.seo.metaDescription !== null : null
    ),
    row('structured_data', 'presence', (p) => (p.seo ? p.seo.jsonLdTypes.length > 0 : null)),
    row('lcp', 'seconds', (p) => p.performance?.lcpMs ?? null),
    row('page_weight', 'megabytes', (p) => p.performance?.transferredBytes ?? null)
  ].filter((entry): entry is ComparisonRow => entry !== null)
}

export function readout(input: ReadoutInput): Readout {
  return { findings: measuredFindings(input), comparison: comparisonRows(input) }
}

export function hasReadout(value: Readout): boolean {
  return value.findings.length > 0 || value.comparison.length > 0
}
