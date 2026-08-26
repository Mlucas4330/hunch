import { READOUT_THRESHOLDS } from '@/lib/constants'
import type {
  ReadoutFinding,
  ReadoutGroup,
  ReadoutSeverity,
  ReadoutUnit
} from '@/lib/enums'
import type { Market } from '@/lib/enums'
import type { PageMobile, PagePerformance, PageSeo, PageStructure } from '@/lib/scrape'
import type { CrawlerAccess } from '@/lib/robots'
import type { PageKeywords } from '@/lib/keywords'

export type MeasuredFinding = {
  id: ReadoutFinding
  group: ReadoutGroup
  severity: ReadoutSeverity
  value: number
  unit: ReadoutUnit
}

export type ReadoutInput = {
  structure: PageStructure | null
  seo: PageSeo | null
  performance: PagePerformance | null
  crawler: CrawlerAccess | null
  keywords: PageKeywords | null
  mobile: PageMobile | null
  // Only one finding reads it, and it reads it to stay silent: a CNPJ in the footer is a Brazilian
  // convention, so its absence is a finding in Brazil and noise anywhere else. Same rule as
  // everywhere else -- the market filters what may be said, it is never a fact about buyers. See
  // docs/invariants.md.
  market: Market | null
}

export type Readout = {
  findings: MeasuredFinding[]
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
  const { structure, seo, performance, crawler, keywords, mobile, market } = input
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

      // Read from the DOM, never by filling the form in: submitting a stranger's form would write a
      // fake lead into their CRM every time somebody ran an analysis. See docs/scraping.md.
      //
      // Each guard is `!== undefined` rather than a truthiness check, because zero is a real and
      // common answer for all four -- and the value these rows carry when nobody measured them is
      // absent, not zero.
      if (structure.requiredFieldCount !== undefined) {
        out.push(
          count(
            'required_fields',
            'structure',
            structure.requiredFieldCount,
            rank(
              structure.requiredFieldCount,
              READOUT_THRESHOLDS.requiredFieldsWarn,
              READOUT_THRESHOLDS.requiredFieldsAlert
            )
          )
        )
      }

      if (structure.fieldsWithoutLabel !== undefined) {
        out.push(
          count(
            'fields_without_label',
            'structure',
            structure.fieldsWithoutLabel,
            rank(
              structure.fieldsWithoutLabel,
              READOUT_THRESHOLDS.fieldsWithoutLabelWarn,
              READOUT_THRESHOLDS.fieldsWithoutLabelAlert
            )
          )
        )
      }

      if (structure.formSteps !== undefined) {
        out.push(
          count(
            'form_steps',
            'structure',
            structure.formSteps,
            rank(
              structure.formSteps,
              READOUT_THRESHOLDS.formStepsWarn,
              READOUT_THRESHOLDS.formStepsAlert
            )
          )
        )
      }

      // A form with nothing to submit it is broken rather than merely costly, so it is an alert on
      // its own scale rather than a count with thresholds.
      if (structure.hasSubmit !== undefined) {
        out.push({
          id: 'no_submit',
          group: 'structure',
          severity: structure.hasSubmit ? 'ok' : 'alert',
          value: structure.hasSubmit ? 1 : 0,
          unit: 'presence'
        })
      }
    }

    // Outside the form guard: a dead call to action is a dead link whether or not the page collects
    // anything.
    if (structure.deadCtaCount !== undefined) {
      out.push(
        count(
          'dead_ctas',
          'structure',
          structure.deadCtaCount,
          rank(
            structure.deadCtaCount,
            READOUT_THRESHOLDS.deadCtasWarn,
            READOUT_THRESHOLDS.deadCtasAlert
          )
        )
      )
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

  // Trust. Gated on one field rather than on `structure`, because a row measured before this pass
  // existed has the object but none of these keys: `structure` being present says nothing about
  // whether anybody counted a trust signal on it.
  if (structure && structure.trustBadgeCount !== undefined) {
    // Only in Brazil, and this is the whole of what the market decides here. A CNPJ in the footer is
    // a convention there; on a US page its absence is not a finding, it is noise. The market rules
    // out a sentence, it never supplies a fact about buyers -- see docs/invariants.md.
    if (market === 'br' && structure.hasCnpj !== undefined) {
      out.push(presence('no_cnpj', 'trust', structure.hasCnpj))
    }

    out.push(presence('no_trust_badge', 'trust', structure.trustBadgeCount > 0))

    // Only for a page that has testimonials at all. `no_testimonials` above already says when there
    // are none, and following it with "0 of them carry a name" is the same absence said twice.
    if (structure.hasTestimonials && structure.testimonialWithAttributionCount !== undefined) {
      out.push(
        count(
          'testimonial_attribution',
          'trust',
          structure.testimonialWithAttributionCount,
          rankBelow(
            structure.testimonialWithAttributionCount,
            READOUT_THRESHOLDS.testimonialAttributionWarn
          )
        )
      )
    }

    if (structure.hasPrivacyPolicy !== undefined) {
      out.push(presence('no_privacy_policy', 'trust', structure.hasPrivacyPolicy))
    }

    // One reachable channel is the finding, not which one. A page with a phone number and no address
    // is contactable, and saying otherwise would be an accusation about a choice rather than a gap.
    if (structure.hasPhone !== undefined && structure.hasPhysicalAddress !== undefined) {
      out.push(
        presence(
          'no_contact_channel',
          'trust',
          structure.hasPhone || structure.hasPhysicalAddress || Boolean(structure.hasSocialLinks)
        )
      )
    }
  }

  // Mobile. `null` is a page nobody measured on a phone, and the whole group is skipped rather than
  // reported as a page with no problems -- the same rule as the robots.txt guard below.
  if (mobile) {
    out.push({
      id: 'mobile_overflow',
      group: 'mobile',
      severity: mobile.horizontalOverflow ? 'alert' : 'ok',
      value: mobile.horizontalOverflow ? 0 : 1,
      unit: 'presence'
    })

    out.push({
      id: 'no_viewport_meta',
      group: 'mobile',
      severity: mobile.hasViewportMeta ? 'ok' : 'alert',
      value: mobile.hasViewportMeta ? 1 : 0,
      unit: 'presence'
    })

    out.push(
      count(
        'mobile_tap_targets',
        'mobile',
        mobile.smallTapTargetCount,
        rank(
          mobile.smallTapTargetCount,
          READOUT_THRESHOLDS.tapTargetsWarn,
          READOUT_THRESHOLDS.tapTargetsAlert
        )
      )
    )

    out.push(
      count(
        'mobile_tiny_text',
        'mobile',
        mobile.tinyTextCount,
        rank(
          mobile.tinyTextCount,
          READOUT_THRESHOLDS.tinyTextWarn,
          READOUT_THRESHOLDS.tinyTextAlert
        )
      )
    )

    out.push(
      count(
        'mobile_above_fold_ctas',
        'mobile',
        mobile.aboveFoldCtaCount,
        mobile.aboveFoldCtaCount === 0
          ? 'alert'
          : rank(mobile.aboveFoldCtaCount, READOUT_THRESHOLDS.aboveFoldCtasWarn)
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

export function readout(input: ReadoutInput): Readout {
  return { findings: measuredFindings(input) }
}

export function hasReadout(value: Readout): boolean {
  return value.findings.length > 0
}
