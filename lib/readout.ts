import { READOUT_THRESHOLDS } from '@/lib/constants'
import type {
  ReadoutCriterionKind,
  ReadoutFinding,
  ReadoutGroup,
  ReadoutSeverity,
  ReadoutUnit
} from '@/lib/enums'
import type { Market } from '@/lib/enums'
import type { PageMobile, PagePerformance, PageSeo, PageStructure } from '@/lib/scrape'
import type { CrawlerAccess } from '@/lib/robots'
import type { PageKeywords } from '@/lib/keywords'

/**
 * The threshold this finding was judged against, in the finding's own unit.
 *
 * **Null on every presence finding, and that is the point rather than an omission.** "Sign in with
 * Google or GitHub / No" already says which answer is the bad one; "Signup form fields / 6" does
 * not, and it is the counted findings this exists for.
 */
export type ReadoutCriterion = { kind: ReadoutCriterionKind; threshold: number }

export type MeasuredFinding = {
  id: ReadoutFinding
  group: ReadoutGroup
  severity: ReadoutSeverity
  value: number
  unit: ReadoutUnit
  /** See ReadoutCriterion. Null when the finding has no numeric boundary. */
  criterion: ReadoutCriterion | null
}

/**
 * What a ranker answers: the severity, and the boundary it used to decide it.
 *
 * **The two travel together so they cannot disagree.** The alternative was a second map from finding
 * id to threshold, read by the renderer -- which is a copy of what `measuredFindings` already knows,
 * and the first edit to READOUT_THRESHOLDS that missed the copy would have printed a boundary this
 * code does not actually apply. The whole product rests on the printed number being the counted one.
 */
type Ranked = { severity: ReadoutSeverity; criterion: ReadoutCriterion | null }

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

// **The criterion carries the warn boundary and never the alert one.** Warn is the line between
// fine and not fine, which is the question a reader looking at a bare number is asking; how far past
// it they are is what the severity colour already says. Printing both turned one short line into two
// numbers that had to be read against each other.
function rank(value: number, warn: number, alert?: number): Ranked {
  const severity: ReadoutSeverity =
    alert !== undefined && value >= alert ? 'alert' : value >= warn ? 'warn' : 'ok'
  return { severity, criterion: { kind: 'above', threshold: warn } }
}

// The mirror of `rank`, for the metrics where too little is the problem. Boundaries stay inclusive
// in the same direction: landing exactly on the threshold is already the bad side.
function rankBelow(value: number, warn: number, alert?: number): Ranked {
  const severity: ReadoutSeverity =
    alert !== undefined && value <= alert ? 'alert' : value <= warn ? 'warn' : 'ok'
  return { severity, criterion: { kind: 'below', threshold: warn } }
}

// Both ends are bad: none at all is the alert, and past the threshold the "primary" action is
// whichever one the visitor happens to see first.
function band(value: number, warn: number): Ranked {
  const { severity } = rank(value, warn)
  return {
    severity: value === 0 ? 'alert' : severity,
    criterion: { kind: 'band', threshold: warn }
  }
}

// One target, wrong in either direction.
function exactly(value: number, target: number): Ranked {
  return {
    severity: value === target ? 'ok' : 'warn',
    criterion: { kind: 'exactly', threshold: target }
  }
}

// One is already the finding. `hit` is how badly, which is the only thing separating an image with
// no alt text from a blocked AI crawler.
function anyOf(value: number, hit: ReadoutSeverity): Ranked {
  return { severity: value > 0 ? hit : 'ok', criterion: { kind: 'above', threshold: 1 } }
}

function count(
  id: ReadoutFinding,
  group: ReadoutGroup,
  value: number,
  ranked: Ranked
): MeasuredFinding {
  return { id, group, value, unit: 'count', ...ranked }
}

function presence(
  id: ReadoutFinding,
  group: ReadoutGroup,
  present: boolean
): MeasuredFinding {
  return {
    id,
    group,
    severity: present ? 'ok' : 'warn',
    value: present ? 1 : 0,
    unit: 'presence',
    criterion: null
  }
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
      // **Asked only of a page that actually signs people in**, the same shape as the CNPJ and the
      // testimonial-attribution findings below: a question put to a page that cannot answer it is not
      // a finding, it is an accusation. `formCount > 0` is not that question -- a search box, a
      // newsletter field and a URL analyser are all forms.
      //
      // Nor is "there is a sign in link somewhere on it". That was this guard's first version and it
      // was still wrong: a landing page whose header says `Entrar` sends the visitor to a different
      // URL, and **this analysis never opened that URL**. Recommending social login off the back of it
      // is a fix for a page nobody measured -- which is exactly what our own report did to a product
      // whose sign in page has offered Google and GitHub all along.
      //
      // `hasOauth` first, and the order preserves rows measured before `hasAuthForm` existed: OAuth
      // present proves the credentials are collected here, so those still report exactly as they
      // always did. An older row without it drops the finding rather than emitting `false`, because
      // "we never measured whether this page signs anybody in" is not "this page has no social sign
      // in". See docs/invariants.md.
      if (structure.hasOauth || structure.hasAuthForm === true) {
        out.push(presence('no_social_signin', 'structure', structure.hasOauth))
      }

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
          unit: 'presence',
          criterion: null
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
        band(structure.aboveFoldCtaCount, READOUT_THRESHOLDS.aboveFoldCtasWarn)
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
      out.push(presence('no_cnpj', 'credibility', structure.hasCnpj))
    }

    out.push(presence('no_trust_badge', 'credibility', structure.trustBadgeCount > 0))

    // Only for a page that has testimonials at all. `no_testimonials` above already says when there
    // are none, and following it with "0 of them carry a name" is the same absence said twice.
    if (structure.hasTestimonials && structure.testimonialWithAttributionCount !== undefined) {
      out.push(
        count(
          'testimonial_attribution',
          'credibility',
          structure.testimonialWithAttributionCount,
          rankBelow(
            structure.testimonialWithAttributionCount,
            READOUT_THRESHOLDS.testimonialAttributionWarn
          )
        )
      )
    }

    if (structure.hasPrivacyPolicy !== undefined) {
      out.push(presence('no_privacy_policy', 'credibility', structure.hasPrivacyPolicy))
    }

    // One reachable channel is the finding, not which one. A page with a phone number and no address
    // is contactable, and saying otherwise would be an accusation about a choice rather than a gap.
    if (structure.hasPhone !== undefined && structure.hasPhysicalAddress !== undefined) {
      out.push(
        presence(
          'no_contact_channel',
          'credibility',
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
      unit: 'presence',
      criterion: null
    })

    out.push({
      id: 'no_viewport_meta',
      group: 'mobile',
      severity: mobile.hasViewportMeta ? 'ok' : 'alert',
      value: mobile.hasViewportMeta ? 1 : 0,
      unit: 'presence',
      criterion: null
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
        band(mobile.aboveFoldCtaCount, READOUT_THRESHOLDS.aboveFoldCtasWarn)
      )
    )
  }

  if (seo) {
    if (seo.robotsMeta?.toLowerCase().includes('noindex')) {
      out.push({
        id: 'noindex',
        group: 'declared',
        severity: 'alert',
        value: 1,
        unit: 'presence',
        criterion: null
      })
    }

    out.push(presence('no_meta_description', 'declared', seo.metaDescription !== null))
    out.push(count('h1_count', 'declared', seo.h1Count, exactly(seo.h1Count, 1)))
    out.push(
      count('images_missing_alt', 'declared', seo.imagesMissingAlt, anyOf(seo.imagesMissingAlt, 'warn'))
    )
    out.push(presence('no_structured_data', 'declared', seo.jsonLdTypes.length > 0))
    out.push(presence('no_og_image', 'declared', seo.hasOgImage))
    out.push(presence('no_canonical', 'declared', seo.canonical !== null))
    out.push(presence('no_lang', 'declared', seo.lang !== null))
    out.push(
      count(
        'internal_links',
        'declared',
        seo.internalLinkCount,
        rankBelow(seo.internalLinkCount, READOUT_THRESHOLDS.internalLinksWarn)
      )
    )
  }

  // Where the page's most repeated term already appears. A page with nothing to read has no leading
  // term, and three warns about a term that does not exist would be an accusation about nothing.
  const leadTerm = keywords?.terms[0]
  if (leadTerm) {
    out.push(presence('term_in_title', 'declared', leadTerm.inTitle))
    out.push(presence('term_in_h1', 'declared', leadTerm.inH1))
    out.push(presence('term_in_meta_description', 'declared', leadTerm.inMetaDescription))
  }

  // An unreadable robots.txt is not a permissive one. The whole group is skipped rather than
  // reporting a network failure as an open door -- or as a closed one.
  if (crawler && crawler.status !== 'unknown') {
    out.push(
      count(
        'ai_crawlers_blocked',
        'crawler_access',
        crawler.blockedAgents.length,
        anyOf(crawler.blockedAgents.length, 'alert')
      )
    )

    out.push({
      id: 'robots_blocks_all',
      group: 'crawler_access',
      severity: crawler.blocksAll ? 'alert' : 'ok',
      value: crawler.blocksAll ? 0 : 1,
      unit: 'presence',
      criterion: null
    })

    out.push(presence('no_sitemap', 'crawler_access', crawler.sitemaps.length > 0))
  }

  if (performance) {
    if (performance.ttfbMs !== null) {
      out.push({
        id: 'ttfb',
        group: 'load',
        ...rank(performance.ttfbMs, READOUT_THRESHOLDS.ttfbWarnMs, READOUT_THRESHOLDS.ttfbAlertMs),
        value: performance.ttfbMs,
        unit: 'seconds'
      })
    }

    if (performance.fcpMs !== null) {
      out.push({
        id: 'fcp',
        group: 'load',
        ...rank(performance.fcpMs, READOUT_THRESHOLDS.fcpWarnMs, READOUT_THRESHOLDS.fcpAlertMs),
        value: performance.fcpMs,
        unit: 'seconds'
      })
    }

    if (performance.lcpMs !== null) {
      out.push({
        id: 'lcp',
        group: 'load',
        ...rank(performance.lcpMs, READOUT_THRESHOLDS.lcpWarnMs, READOUT_THRESHOLDS.lcpAlertMs),
        value: performance.lcpMs,
        unit: 'seconds'
      })
    }

    if (performance.transferredBytes !== null) {
      out.push({
        id: 'page_weight',
        group: 'load',
        ...rank(performance.transferredBytes, READOUT_THRESHOLDS.pageWeightWarnBytes, READOUT_THRESHOLDS.pageWeightAlertBytes),
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
