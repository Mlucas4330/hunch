import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deltas, snapshotInput, snapshotValues } from './snapshots'
import { FIXTURE_CRAWLER_ACCESS, FIXTURE_KEYWORDS, FIXTURE_MOBILE, FIXTURE_PERFORMANCE, FIXTURE_SEO, FIXTURE_STRUCTURE } from './ai/fixtures'
import type { MeasuredColumns } from './snapshots'
import type { Market } from './enums'

const MARKET: Market = 'us'

const MEASUREMENT: MeasuredColumns = {
  structure: FIXTURE_STRUCTURE,
  seo: FIXTURE_SEO,
  performance: FIXTURE_PERFORMANCE,
  crawlerAccess: FIXTURE_CRAWLER_ACCESS,
  keywords: FIXTURE_KEYWORDS,
  mobile: FIXTURE_MOBILE
}

function measurement(overrides: Partial<MeasuredColumns>): MeasuredColumns {
  return { ...MEASUREMENT, ...overrides }
}

test('a snapshot reads as a readout', () => {
  const input = snapshotInput(snapshotValues('id', MEASUREMENT, MARKET), MARKET)

  assert.equal(input.structure, FIXTURE_STRUCTURE)
  assert.equal(input.crawler, FIXTURE_CRAWLER_ACCESS)
})

test('the score is frozen at capture', () => {
  const values = snapshotValues('id', MEASUREMENT, MARKET)

  assert.equal(typeof values.score, 'number')
  assert.ok(values.score !== null && values.score >= 0 && values.score <= 100)
  assert.equal(values.analysisId, 'id')
})

test('nothing to compare against produces no deltas at all', () => {
  const current = snapshotInput(snapshotValues('id', MEASUREMENT, MARKET), MARKET)

  assert.equal(deltas(current, null).size, 0)
  assert.equal(deltas(current, current).size, 0, 'an unchanged number is not a delta')
})

test('a delta is the difference in the unit it was measured in', () => {
  const before = snapshotInput(
    snapshotValues('id', measurement({ performance: { ...FIXTURE_PERFORMANCE, lcpMs: 4200 } }), MARKET),
    MARKET
  )
  const after = snapshotInput(
    snapshotValues('id', measurement({ performance: { ...FIXTURE_PERFORMANCE, lcpMs: 2100 } }), MARKET),
    MARKET
  )
  const moved = deltas(after, before)

  assert.equal(moved.get('lcp'), -2100, 'milliseconds, not seconds: conversion happens at the edge')
  assert.equal(moved.has('request_count'), false, 'what did not move is not listed')
})

test('a finding that only exists on one side is not a delta', () => {
  const measured = snapshotInput(snapshotValues('id', MEASUREMENT, MARKET), MARKET)
  const unread = snapshotInput(
    snapshotValues('id', measurement({ crawlerAccess: { ...FIXTURE_CRAWLER_ACCESS, status: 'unknown' } }), MARKET),
    MARKET
  )

  assert.equal(
    deltas(measured, unread).has('ai_crawlers_blocked'),
    false,
    'appearing for the first time is not a change in a number'
  )
})
