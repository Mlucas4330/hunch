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

// The measured readout: the one family of numbers this product shows a reader.
//
// Everything here is arithmetic over what the scrape counted. No sentence is written in this file --
// a finding carries an id and a value, and `dictionary.readout.findings[id]` holds the sentence with
// `{value}` interpolated by t(). That split is the guarantee: a number cannot reach the reader
// without a code path putting it there, and the model never sees any of it.
//
// It is deliberately NOT the counterpart of the quantitative ban in playbookPrompt /
// visibilityPrompt. That rule governs what a model may write and is untouched. This governs what
// measurement may state, and the two never mix in one sentence.

// Rendered as a label and a value, not as a sentence. That is what lets one string per finding cover
// every severity: "Signup form fields / 7" is true whether 7 is fine or terrible, where a sentence
// like "your form asks for too many fields" would have to be written once per state -- and a
// presence finding's sentence ("there is no FAQ") is outright false in its own `ok` case.
//
// It also reads like what it is. A measurement table is more credible to a stranger than the same
// numbers wrapped in prose telling them what to think about them.
export type MeasuredFinding = {
  id: ReadoutFinding
  group: ReadoutGroup
  severity: ReadoutSeverity
  // What was counted, in the unit it was counted in -- bytes and milliseconds stay raw so nothing is
  // rounded twice. For `presence` this is 1 when the page has the thing its label names, 0 when not.
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

// `ok` when below the first threshold, `warn` at it, `alert` at the second. Written once because
// eight findings share the shape, and getting the boundary wrong in one hand-rolled copy of it is
// exactly the kind of drift that puts a red badge on a healthy page.
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

// A finding about something the page either has or does not. Every label in this family names the
// thing in its POSITIVE form ("FAQ section", "Meta description"), so `present` reads as yes/no and
// the row means the same whichever way it lands.
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
    // Only when the page actually has a form. On a page with none, "asks for 0 fields" is not a
    // healthy score, it is a question that was never asked -- and the same goes for offering social
    // sign in on a page with nothing to sign in to.
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

    // Both ends are a finding: nothing above the fold means the visitor has to hunt for the action,
    // and too many means none of them is the primary one.
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
    // Emitted only when true, unlike every other absence here. A page that is not noindexed is the
    // unremarkable default, so an `ok` row for it would be one more line to read on every report in
    // exchange for no information -- while the true case is the single most severe thing this
    // readout can find.
    if (seo.robotsMeta?.toLowerCase().includes('noindex')) {
      // The one presence row whose label names something bad, so `present` is the alert rather than
      // the healthy state.
      out.push({ id: 'noindex', group: 'metadata', severity: 'alert', value: 1, unit: 'presence' })
    }

    out.push(presence('no_meta_description', 'metadata', seo.metaDescription !== null))
    // Zero and many are both wrong, so the value is what is shown and only 1 is `ok`.
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
    // Each load metric is skipped when the browser reported nothing for it. A missing measurement is
    // not a fast page, and this is the last place that distinction can still be preserved.
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

// The side-by-side table. Empty unless competitors were actually measured, which today means paid
// Competitor mode -- the auto path never opens a competitor's page, and a comparison against pages
// nobody loaded would be exactly the invented number this whole module exists to avoid.
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

// What the component asks before rendering a heading. An analysis created before these columns
// existed holds null for all of them and produces nothing, exactly like a playbook that failed to
// generate -- no backfill, no empty section.
export function hasReadout(value: Readout): boolean {
  return value.findings.length > 0 || value.comparison.length > 0
}
