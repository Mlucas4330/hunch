import { test } from 'node:test'
import assert from 'node:assert/strict'
import { comparisonRows, hasReadout, measuredFindings, readout } from './readout'
import { READOUT_THRESHOLDS } from './constants'
import type { CompetitorStructure, PagePerformance, PageSeo, PageStructure } from './scrape'

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
  jsonLdTypes: ['Organization']
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

function findingsFor(overrides: {
  structure?: Partial<PageStructure>
  seo?: Partial<PageSeo>
  performance?: Partial<PagePerformance>
}) {
  return measuredFindings({
    structure: { ...STRUCTURE, ...overrides.structure },
    seo: { ...SEO, ...overrides.seo },
    performance: { ...PERFORMANCE, ...overrides.performance },
    competitors: null
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
  const findings = findingsFor({ performance: { lcpMs: null, transferredBytes: null } })

  assert.equal(find(findings, 'lcp'), undefined)
  assert.equal(find(findings, 'page_weight'), undefined)
  assert.ok(find(findings, 'request_count'), 'a metric that WAS reported still appears')
})

test('noindex is emitted only when the page is actually noindexed', () => {
  assert.equal(find(findingsFor({ seo: { robotsMeta: 'index, follow' } }), 'noindex'), undefined)
  assert.equal(find(findingsFor({ seo: { robotsMeta: null } }), 'noindex'), undefined)

  const flagged = find(findingsFor({ seo: { robotsMeta: 'NOINDEX, nofollow' } }), 'noindex')
  assert.equal(flagged?.severity, 'alert', 'and the match is case insensitive')
  assert.equal(flagged?.value, 1)
})

test('a null readout produces nothing at all', () => {
  const empty = readout({ structure: null, seo: null, performance: null, competitors: null })

  assert.deepEqual(empty.findings, [])
  assert.deepEqual(empty.comparison, [])
  assert.equal(hasReadout(empty), false)
})

test('the comparison table needs competitors that were actually measured', () => {
  const competitors: CompetitorStructure[] = [
    { name: 'rival.com', url: 'https://rival.com', structure: { ...STRUCTURE, formFieldCount: 1 } }
  ]

  assert.deepEqual(
    comparisonRows({ structure: STRUCTURE, seo: SEO, performance: PERFORMANCE, competitors: [] }),
    [],
    'no measured competitor means no table, never a table of one'
  )

  const rows = comparisonRows({
    structure: STRUCTURE,
    seo: SEO,
    performance: PERFORMANCE,
    competitors
  })
  const formRow = rows.find((row) => row.metric === 'form_fields')

  assert.equal(formRow?.self, STRUCTURE.formFieldCount)
  assert.deepEqual(formRow?.competitors, [{ name: 'rival.com', value: 1 }])
})
