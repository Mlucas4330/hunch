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

export type MeasuredFinding = {
  id: ReadoutFinding
  group: ReadoutGroup
  severity: ReadoutSeverity
  value: number
  unit: ReadoutUnit
}

export type ComparisonRow = {
  metric: ReadoutComparison
  self: number | boolean
  competitors: { name: string; value: number | boolean }[]
}

export type ReadoutInput = {
  structure: PageStructure | null
  seo: PageSeo | null
  performance: PagePerformance | null
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
  const { structure, seo, performance } = input
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
  }

  if (performance) {
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

export function comparisonRows(input: ReadoutInput): ComparisonRow[] {
  const { structure, competitors } = input
  if (!structure || !competitors?.length) return []

  const row = (
    metric: ReadoutComparison,
    read: (s: PageStructure) => number | boolean
  ): ComparisonRow => ({
    metric,
    self: read(structure),
    competitors: competitors.map((c) => ({ name: c.name, value: read(c.structure) }))
  })

  return [
    row('form_fields', (s) => s.formFieldCount),
    row('social_signin', (s) => s.hasOauth),
    row('above_fold_ctas', (s) => s.aboveFoldCtaCount),
    row('nav_links', (s) => s.navLinkCount)
  ]
}

export function readout(input: ReadoutInput): Readout {
  return { findings: measuredFindings(input), comparison: comparisonRows(input) }
}

export function hasReadout(value: Readout): boolean {
  return value.findings.length > 0 || value.comparison.length > 0
}
