import assert from 'node:assert/strict'
import { test } from 'node:test'
import { conversionDateTime } from '@/lib/google-ads'

/**
 * The timestamp is the one thing here that fails quietly.
 *
 * A wrong amount is refused, a wrong click id is refused, a wrong conversion action is refused --
 * every other mistake comes back as a `partialFailureError` naming itself. An offset that is three
 * hours out is accepted and simply files each conversion on the wrong side of midnight, which shows
 * up months later as a channel that looks worse on Mondays.
 */

test('renders the account timezone rather than UTC', () => {
  // Midday UTC is 09:00 in Sao Paulo, year round: Brazil abolished DST in 2019.
  const value = conversionDateTime(new Date('2026-03-15T12:00:00Z'))

  assert.equal(value, '2026-03-15 09:00:00-03:00')
})

test('carries the date back a day when the offset crosses midnight', () => {
  // 01:30 UTC is 22:30 the previous day in Sao Paulo. Formatting the date from the UTC parts and
  // only the clock from the local ones would produce the 16th here, which is the bug this catches.
  const value = conversionDateTime(new Date('2026-03-16T01:30:00Z'))

  assert.equal(value, '2026-03-15 22:30:00-03:00')
})

test('renders midnight as 00 rather than 24', () => {
  // 03:00 UTC is exactly midnight in Sao Paulo, and some runtimes render that hour as `24` under
  // hour12: false. The API refuses it.
  const value = conversionDateTime(new Date('2026-03-16T03:00:00Z'))

  assert.equal(value, '2026-03-16 00:00:00-03:00')
})

test('pads every field to the width the API demands', () => {
  const value = conversionDateTime(new Date('2026-01-05T14:03:07Z'))

  assert.match(value, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
})
