import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasReadout, measuredFindings, readout } from './readout'
import { READOUT_THRESHOLDS } from './constants'
import type { PagePerformance, PageSeo, PageStructure } from './scrape'
import type { CrawlerAccess } from './robots'
import type { PageKeywords } from './keywords'

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
}) {
  return measuredFindings({
    structure: { ...STRUCTURE, ...overrides.structure },
    seo: { ...SEO, ...overrides.seo },
    performance: { ...PERFORMANCE, ...overrides.performance },
    crawler: { ...CRAWLER, ...overrides.crawler },
    keywords: overrides.keywords === undefined ? KEYWORDS : overrides.keywords
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
    keywords: null
  })

  assert.deepEqual(empty.findings, [])
  assert.equal(hasReadout(empty), false)
})

