import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasReadout, measuredFindings, readout } from './readout'
import { READOUT_THRESHOLDS } from './constants'
import type { PageMobile, PagePerformance, PageSeo, PageStructure } from './scrape'
import type { CrawlerAccess } from './robots'
import type { PageKeywords } from './keywords'
import type { Market } from './enums'

const STRUCTURE: PageStructure = {
  hasOauth: false,
  oauthProviders: [],
  formCount: 1,
  formFieldCount: 5,
  hasFaq: false,
  hasPricing: true,
  hasTestimonials: true,
  hasVideo: false,
  hasStickyCta: false,
  bodyLinkCount: 22,
  aboveFoldCtaCount: 2,
  navLinkCount: 6,
  headingCount: 12,
  sectionCount: 8,
  wordCount: 640
}

const SEO: PageSeo = {
  title: 'Acme',
  metaDescription: 'A description',
  canonical: 'https://acme.com',
  robotsMeta: null,
  lang: 'en',
  h1Count: 1,
  imageCount: 8,
  imagesMissingAlt: 0,
  internalLinkCount: 11,
  hasOgTitle: true,
  hasOgDescription: true,
  hasOgImage: true,
  jsonLdTypes: ['Organization'],
  headings: ['Acme']
}

const PERFORMANCE: PagePerformance = {
  ttfbMs: 180,
  fcpMs: 900,
  lcpMs: 1400,
  domContentLoadedMs: 1100,
  loadMs: 1800,
  transferredBytes: 900_000,
  requestCount: 30,
  domNodeCount: 800
}

const CRAWLER: CrawlerAccess = {
  status: 'found',
  blockedAgents: [],
  blocksAll: false,
  sitemaps: ['https://acme.com/sitemap.xml']
}

const KEYWORDS: PageKeywords = {
  totalWords: 640,
  terms: [
    { term: 'acme', count: 9, inTitle: true, inH1: true, inMetaDescription: true, inHeadings: true }
  ]
}

function findingsFor(overrides: {
  structure?: Partial<PageStructure>
  seo?: Partial<PageSeo>
  performance?: Partial<PagePerformance>
  crawler?: Partial<CrawlerAccess>
  keywords?: PageKeywords | null
  mobile?: PageMobile | null
  market?: Market | null
}) {
  return measuredFindings({
    structure: { ...STRUCTURE, ...overrides.structure },
    seo: { ...SEO, ...overrides.seo },
    performance: { ...PERFORMANCE, ...overrides.performance },
    crawler: { ...CRAWLER, ...overrides.crawler },
    keywords: overrides.keywords === undefined ? KEYWORDS : overrides.keywords,
    // Both default to absent, so every test written before these existed still describes a page
    // measured without them -- which is exactly the row shape the guards have to handle.
    mobile: overrides.mobile ?? null,
    market: overrides.market ?? null
  })
}

function find(
  list: ReturnType<typeof measuredFindings>,
  id: (typeof list)[number]['id']
) {
  return list.find((finding) => finding.id === id)
}

test('every emitted value comes from the input, never from a literal in the module', () => {
  const findings = findingsFor({
    structure: { formFieldCount: 9, aboveFoldCtaCount: 3, navLinkCount: 17 },
    seo: { h1Count: 4, imagesMissingAlt: 6 },
    performance: { lcpMs: 3333, transferredBytes: 7_777_777, requestCount: 123 }
  })

  assert.equal(find(findings, 'form_fields')?.value, 9)
  assert.equal(find(findings, 'above_fold_ctas')?.value, 3)
  assert.equal(find(findings, 'nav_links')?.value, 17)
  assert.equal(find(findings, 'h1_count')?.value, 4)
  assert.equal(find(findings, 'images_missing_alt')?.value, 6)
  assert.equal(find(findings, 'lcp')?.value, 3333)
  assert.equal(find(findings, 'page_weight')?.value, 7_777_777)
  assert.equal(find(findings, 'request_count')?.value, 123)
})

test('a presence finding reads as yes/no on the positive form of its label', () => {
  const missing = findingsFor({
    seo: { metaDescription: null, jsonLdTypes: [], hasOgImage: false }
  })
  const present = findingsFor({})

  for (const id of ['no_meta_description', 'no_structured_data', 'no_og_image'] as const) {
    assert.equal(find(missing, id)?.value, 0, `${id} is 0 when the page lacks it`)
    assert.equal(find(missing, id)?.severity, 'warn')
    assert.equal(find(present, id)?.value, 1, `${id} is 1 when the page has it`)
    assert.equal(find(present, id)?.severity, 'ok')
    assert.equal(find(present, id)?.unit, 'presence')
  }
})

test('a page with no form is not asked about its form', () => {
  const findings = findingsFor({ structure: { formCount: 0, formFieldCount: 0, hasOauth: false } })

  assert.equal(find(findings, 'form_fields'), undefined)
  assert.equal(find(findings, 'no_social_signin'), undefined)
})

test('severity boundaries sit exactly on the thresholds', () => {
  const below = findingsFor({
    structure: { formFieldCount: READOUT_THRESHOLDS.formFieldsWarn - 1 }
  })
  const at = findingsFor({ structure: { formFieldCount: READOUT_THRESHOLDS.formFieldsWarn } })
  const alert = findingsFor({ structure: { formFieldCount: READOUT_THRESHOLDS.formFieldsAlert } })

  assert.equal(find(below, 'form_fields')?.severity, 'ok')
  assert.equal(find(at, 'form_fields')?.severity, 'warn')
  assert.equal(find(alert, 'form_fields')?.severity, 'alert')
})

test('no call to action above the fold is an alert, not a low count', () => {
  const findings = findingsFor({ structure: { aboveFoldCtaCount: 0 } })
  assert.equal(find(findings, 'above_fold_ctas')?.severity, 'alert')
  assert.equal(find(findings, 'above_fold_ctas')?.value, 0)
})

test('a load metric the browser did not report is skipped, not reported as fast', () => {
  const findings = findingsFor({
    performance: { ttfbMs: null, fcpMs: null, lcpMs: null, transferredBytes: null }
  })

  assert.equal(find(findings, 'ttfb'), undefined)
  assert.equal(find(findings, 'fcp'), undefined)
  assert.equal(find(findings, 'lcp'), undefined)
  assert.equal(find(findings, 'page_weight'), undefined)
  assert.ok(find(findings, 'request_count'), 'a metric that WAS reported still appears')
})

test('for the metrics where too little is the problem, the threshold is the bad side', () => {
  const at = findingsFor({ structure: { wordCount: READOUT_THRESHOLDS.wordCountWarn } })
  const above = findingsFor({ structure: { wordCount: READOUT_THRESHOLDS.wordCountWarn + 1 } })
  const alert = findingsFor({ structure: { wordCount: READOUT_THRESHOLDS.wordCountAlert } })

  assert.equal(find(at, 'word_count')?.severity, 'warn')
  assert.equal(find(above, 'word_count')?.severity, 'ok')
  assert.equal(find(alert, 'word_count')?.severity, 'alert')

  const thin = findingsFor({
    structure: { headingCount: READOUT_THRESHOLDS.headingCountWarn },
    seo: { internalLinkCount: READOUT_THRESHOLDS.internalLinksWarn }
  })

  assert.equal(find(thin, 'heading_count')?.severity, 'warn')
  assert.equal(find(thin, 'internal_links')?.severity, 'warn')
  assert.equal(find(thin, 'heading_count')?.value, READOUT_THRESHOLDS.headingCountWarn)
})

test('a metadata field the page never declared reads as absent, not as empty', () => {
  const missing = findingsFor({ seo: { canonical: null, lang: null } })
  const present = findingsFor({})

  for (const id of ['no_canonical', 'no_lang'] as const) {
    assert.equal(find(missing, id)?.value, 0)
    assert.equal(find(missing, id)?.severity, 'warn')
    assert.equal(find(present, id)?.value, 1)
    assert.equal(find(present, id)?.severity, 'ok')
  }
})

test('noindex is emitted only when the page is actually noindexed', () => {
  assert.equal(find(findingsFor({ seo: { robotsMeta: 'index, follow' } }), 'noindex'), undefined)
  assert.equal(find(findingsFor({ seo: { robotsMeta: null } }), 'noindex'), undefined)

  const flagged = find(findingsFor({ seo: { robotsMeta: 'NOINDEX, nofollow' } }), 'noindex')
  assert.equal(flagged?.severity, 'alert', 'and the match is case insensitive')
  assert.equal(flagged?.value, 1)
})

test('a robots.txt we could not read is not reported as a block, or as an open door', () => {
  const unknown = findingsFor({ crawler: { status: 'unknown' } })

  for (const id of ['ai_crawlers_blocked', 'robots_blocks_all', 'no_sitemap'] as const) {
    assert.equal(find(unknown, id), undefined, `${id} must not stand in for a failed fetch`)
  }

  assert.ok(find(unknown, 'no_meta_description'), 'the rest of the readout is untouched')
})

test('no robots.txt at all is a measured answer, not an unknown one', () => {
  const absent = findingsFor({
    crawler: { status: 'absent', blockedAgents: [], blocksAll: false, sitemaps: [] }
  })

  assert.equal(find(absent, 'ai_crawlers_blocked')?.value, 0)
  assert.equal(find(absent, 'ai_crawlers_blocked')?.severity, 'ok')
  assert.equal(find(absent, 'robots_blocks_all')?.severity, 'ok')
  assert.equal(find(absent, 'no_sitemap')?.severity, 'warn', 'no file means no sitemap declared')
})

test('a blocked AI crawler is an alert and carries the count that was read', () => {
  const blocked = findingsFor({ crawler: { blockedAgents: ['GPTBot', 'ClaudeBot'] } })

  assert.equal(find(blocked, 'ai_crawlers_blocked')?.value, 2)
  assert.equal(find(blocked, 'ai_crawlers_blocked')?.severity, 'alert')
  assert.equal(find(blocked, 'ai_crawlers_blocked')?.group, 'visibility')

  const all = findingsFor({ crawler: { blocksAll: true } })

  assert.equal(find(all, 'robots_blocks_all')?.severity, 'alert')
  assert.equal(find(all, 'robots_blocks_all')?.value, 0, 'the presence reads positively: not allowed')
})

test('a page with nothing to read is not accused of hiding a term it never had', () => {
  const none = findingsFor({ keywords: { totalWords: 0, terms: [] } })

  for (const id of ['term_in_title', 'term_in_h1', 'term_in_meta_description'] as const) {
    assert.equal(find(none, id), undefined)
  }

  const missing = findingsFor({
    keywords: {
      totalWords: 400,
      terms: [
        {
          term: 'acme',
          count: 9,
          inTitle: false,
          inH1: true,
          inMetaDescription: false,
          inHeadings: true
        }
      ]
    }
  })

  assert.equal(find(missing, 'term_in_title')?.severity, 'warn')
  assert.equal(find(missing, 'term_in_h1')?.severity, 'ok')
  assert.equal(find(missing, 'term_in_meta_description')?.value, 0)
})

test('a null readout produces nothing at all', () => {
  const empty = readout({
    structure: null,
    seo: null,
    performance: null,
    crawler: null,
    keywords: null,
    mobile: null,
    market: null
  })

  assert.deepEqual(empty.findings, [])
  assert.equal(hasReadout(empty), false)
})


// The whole point of the optional fields on PageStructure. `analyses.structure` is a jsonb written
// since long before the form and trust passes existed, so a row measured last month carries the
// object and none of these keys -- and a finding of `0` there would report never-measured as wrong.
// See docs/invariants.md.
test('a structure measured before the form pass existed reports no form findings', () => {
  const old = findingsFor({})

  for (const id of ['required_fields', 'fields_without_label', 'form_steps', 'no_submit', 'dead_ctas'] as const) {
    assert.equal(find(old, id), undefined, `${id} was reported for a page nobody counted it on`)
  }
})

test('a structure measured before the trust pass existed reports no trust findings', () => {
  const old = findingsFor({ market: 'br' })

  assert.equal(old.some((finding) => finding.group === 'trust'), false)
})

test('the form findings appear once the page was actually counted', () => {
  const counted = findingsFor({
    structure: {
      requiredFieldCount: 8,
      fieldsWithoutLabel: 0,
      formSteps: 1,
      hasSubmit: false,
      deadCtaCount: 4
    }
  })

  assert.equal(find(counted, 'required_fields')?.severity, 'alert')
  assert.equal(find(counted, 'fields_without_label')?.severity, 'ok')
  assert.equal(find(counted, 'form_steps')?.value, 1)
  assert.equal(find(counted, 'no_submit')?.severity, 'alert', 'a form with no send button is broken')
  assert.equal(find(counted, 'dead_ctas')?.severity, 'alert')
})

test('a page with no form reports nothing about one, but still reports dead links', () => {
  const noForm = findingsFor({
    structure: { formCount: 0, requiredFieldCount: 0, hasSubmit: false, deadCtaCount: 2 }
  })

  assert.equal(find(noForm, 'required_fields'), undefined)
  assert.equal(find(noForm, 'no_submit'), undefined, 'no form is not a broken form')
  assert.equal(find(noForm, 'dead_ctas')?.value, 2)
})

// The market rules a sentence out, it never supplies a fact about buyers -- see docs/invariants.md.
test('the CNPJ finding is asked only where it is a convention', () => {
  const counted = { trustBadgeCount: 0, hasCnpj: false }

  assert.equal(find(findingsFor({ structure: counted, market: 'br' }), 'no_cnpj')?.severity, 'warn')
  assert.equal(find(findingsFor({ structure: counted, market: 'us' }), 'no_cnpj'), undefined)
  assert.equal(find(findingsFor({ structure: counted, market: null }), 'no_cnpj'), undefined)
})

test('testimonial attribution is only asked of a page that has testimonials', () => {
  const withQuotes = findingsFor({
    structure: { hasTestimonials: true, trustBadgeCount: 0, testimonialWithAttributionCount: 0 }
  })
  const without = findingsFor({
    structure: { hasTestimonials: false, trustBadgeCount: 0, testimonialWithAttributionCount: 0 }
  })

  assert.equal(find(withQuotes, 'testimonial_attribution')?.severity, 'warn')
  assert.equal(
    find(without, 'testimonial_attribution'),
    undefined,
    'no_testimonials already said it; saying it twice is one absence dressed as two'
  )
})

test('one reachable channel is enough to answer the contact finding', () => {
  const base = { trustBadgeCount: 0, hasPhone: false, hasPhysicalAddress: false }

  assert.equal(find(findingsFor({ structure: base }), 'no_contact_channel')?.severity, 'warn')
  assert.equal(
    find(findingsFor({ structure: { ...base, hasPhone: true } }), 'no_contact_channel')?.severity,
    'ok'
  )
})

// Same shape as the robots.txt guard: not measured is skipped whole, never reported as clean.
test('a page nobody opened on a phone reports no mobile findings', () => {
  assert.equal(findingsFor({}).some((finding) => finding.group === 'mobile'), false)
})

const MOBILE: PageMobile = {
  horizontalOverflow: true,
  smallTapTargetCount: 12,
  tinyTextCount: 0,
  aboveFoldCtaCount: 0,
  hasViewportMeta: false
}

test('the mobile group reports what the phone pass counted', () => {
  const phone = findingsFor({ mobile: MOBILE })

  assert.equal(find(phone, 'mobile_overflow')?.severity, 'alert')
  assert.equal(find(phone, 'no_viewport_meta')?.severity, 'alert')
  assert.equal(
    find(phone, 'mobile_tap_targets')?.severity,
    'warn',
    'twelve small controls is a page with a carousel and a row of icons, not a broken one'
  )
  assert.equal(
    find(findingsFor({ mobile: { ...MOBILE, smallTapTargetCount: 25 } }), 'mobile_tap_targets')
      ?.severity,
    'alert'
  )
  assert.equal(find(phone, 'mobile_tiny_text')?.severity, 'ok')
  assert.equal(find(phone, 'mobile_above_fold_ctas')?.severity, 'alert', 'nothing to tap above the fold')

  // The phone pass is a reload on a connection the desktop pass already opened, so it has no load
  // numbers of its own to report -- see PageMobile. The `load` group stays the only place a timing
  // is printed, measured once.
  assert.equal(
    phone.some((finding) => finding.group === 'mobile' && finding.unit === 'seconds'),
    false
  )
})
