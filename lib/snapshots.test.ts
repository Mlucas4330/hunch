import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deltas, snapshotValues } from './snapshots'
import {
  FIXTURE_CRAWLER_ACCESS,
  FIXTURE_KEYWORDS,
  FIXTURE_MOBILE,
  FIXTURE_PAGESPEED,
  FIXTURE_PERFORMANCE,
  FIXTURE_SAMENESS,
  FIXTURE_SEO,
  FIXTURE_SITE_CRAWL,
  FIXTURE_BACKLINKS,
  FIXTURE_RANKED_KEYWORDS,
  FIXTURE_STRUCTURE
} from './ai/fixtures'
import type { MeasuredColumns } from './snapshots'

const MEASUREMENT: MeasuredColumns = {
  structure: FIXTURE_STRUCTURE,
  seo: FIXTURE_SEO,
  performance: FIXTURE_PERFORMANCE,
  crawlerAccess: FIXTURE_CRAWLER_ACCESS,
  keywords: FIXTURE_KEYWORDS,
  mobile: FIXTURE_MOBILE,
  sameness: FIXTURE_SAMENESS,
  pagespeed: FIXTURE_PAGESPEED,
  siteCrawl: FIXTURE_SITE_CRAWL,
  backlinks: FIXTURE_BACKLINKS,
  rankedKeywords: FIXTURE_RANKED_KEYWORDS
}

test('the score is the PageSpeed average, frozen at capture', () => {
  const values = snapshotValues('id', MEASUREMENT)

  assert.equal(values.score, 76)
  assert.equal(values.analysisId, 'id')
  assert.equal(values.pagespeed, FIXTURE_PAGESPEED)
})

test('a measurement PageSpeed never answered for has no score', () => {
  assert.equal(snapshotValues('id', { ...MEASUREMENT, pagespeed: null }).score, null)
})

test('nothing to compare against produces no deltas at all', () => {
  assert.equal(deltas(FIXTURE_PAGESPEED, null).size, 0)
  assert.equal(deltas(FIXTURE_PAGESPEED, FIXTURE_PAGESPEED).size, 0, 'an unchanged score is not a delta')
})

test('a delta is the difference between two category scores', () => {
  const before = { ...FIXTURE_PAGESPEED, categories: { ...FIXTURE_PAGESPEED.categories, performance: 40 } }
  const moved = deltas(FIXTURE_PAGESPEED, before)

  assert.equal(moved.get('performance'), 14)
  assert.equal(moved.has('seo'), false, 'what did not move is not listed')
})

test('a category scored on only one side is not a delta', () => {
  const before = { ...FIXTURE_PAGESPEED, categories: { ...FIXTURE_PAGESPEED.categories, seo: null } }

  assert.equal(deltas(FIXTURE_PAGESPEED, before).has('seo'), false)
})
