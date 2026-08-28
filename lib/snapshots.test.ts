import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deltas, isWorthReporting, regressions, snapshotInput, snapshotValues } from './snapshots'
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

// The regression tests below are what decide whether somebody's week is interrupted. The weekly
// mail used to fire on any delta at all, which made a week of network drift look identical to a
// week where the form doubled in length.

test('nothing to compare against is not a regression', () => {
  const current = snapshotInput(snapshotValues('id', MEASUREMENT, MARKET), MARKET)

  const first = regressions(current, null)
  assert.equal(first.worsened.length, 0)
  assert.equal(first.scoreDrop, 0)
  assert.equal(isWorthReporting(first), false)

  assert.equal(isWorthReporting(regressions(current, current)), false, 'an unchanged page is quiet')
})

test('a finding crossing into a worse severity is a regression', () => {
  const before = snapshotInput(
    snapshotValues('id', measurement({ performance: { ...FIXTURE_PERFORMANCE, lcpMs: 1000 } }), MARKET),
    MARKET
  )
  const after = snapshotInput(
    snapshotValues('id', measurement({ performance: { ...FIXTURE_PERFORMANCE, lcpMs: 9000 } }), MARKET),
    MARKET
  )

  const found = regressions(after, before)

  assert.ok(
    found.worsened.some((finding) => finding.id === 'lcp'),
    'a page that got much slower reports lcp as worsened'
  )
  assert.equal(isWorthReporting(found), true)
})

test('a page that got better is never a regression', () => {
  const slow = snapshotInput(
    snapshotValues('id', measurement({ performance: { ...FIXTURE_PERFORMANCE, lcpMs: 9000 } }), MARKET),
    MARKET
  )
  const fast = snapshotInput(
    snapshotValues('id', measurement({ performance: { ...FIXTURE_PERFORMANCE, lcpMs: 1000 } }), MARKET),
    MARKET
  )

  const found = regressions(fast, slow)

  assert.equal(found.worsened.length, 0, 'improving is not worsening')
  assert.equal(found.scoreDrop, 0, 'a score that rose is a drop of zero, never a negative drop')
  assert.equal(isWorthReporting(found), false, 'an improvement is seen on the report, not pushed')
})

test('a number that moved without crossing a threshold is a delta but not a regression', () => {
  const before = snapshotInput(
    snapshotValues('id', measurement({ performance: { ...FIXTURE_PERFORMANCE, lcpMs: 1000 } }), MARKET),
    MARKET
  )
  const after = snapshotInput(
    snapshotValues('id', measurement({ performance: { ...FIXTURE_PERFORMANCE, lcpMs: 1100 } }), MARKET),
    MARKET
  )

  assert.equal(deltas(after, before).get('lcp'), 100, 'the movement is still recorded')
  assert.equal(
    regressions(after, before).worsened.length,
    0,
    'a hundred milliseconds inside the same band is weather, not news'
  )
})
