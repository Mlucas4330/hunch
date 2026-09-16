import { test } from 'node:test'
import assert from 'node:assert/strict'
import { monthStart, quotaLeft } from './quota-math'

// What an account may still run. The trial is a credit beside the monthly allowance, not part of it,
// which is what lets an account with no quota at all still run its first analyses.

test('what is left is the trial plus the unused monthly quota', () => {
  assert.equal(quotaLeft({ limit: 60, used: 10, trial: 0 }), 50)
  assert.equal(quotaLeft({ limit: 60, used: 10, trial: 3 }), 53)
})

test('a fresh account with no quota still has its trial', () => {
  assert.equal(quotaLeft({ limit: 0, used: 0, trial: 3 }), 3)
})

test('a spent trial and a spent quota leave nothing', () => {
  assert.equal(quotaLeft({ limit: 20, used: 20, trial: 0 }), 0)
  assert.equal(quotaLeft({ limit: 0, used: 0, trial: 0 }), 0)
})

test('an account over its quota reads as zero, never as a negative', () => {
  assert.equal(quotaLeft({ limit: 20, used: 25, trial: 0 }), 0)
  // The trial survives an overdrawn month: it was never part of the monthly allowance.
  assert.equal(quotaLeft({ limit: 20, used: 25, trial: 2 }), 2)
})

// The window the runs are counted in, in UTC, because a quota that reset at a local midnight would
// reset at a different instant for every account.

test('the month starts at the first instant of the UTC month', () => {
  const start = monthStart(new Date('2026-09-15T23:30:00Z'))

  assert.equal(start.toISOString(), '2026-09-01T00:00:00.000Z')
})

test('a timestamp in the last hour of the month still belongs to that month', () => {
  assert.equal(
    monthStart(new Date('2026-12-31T23:59:59Z')).toISOString(),
    '2026-12-01T00:00:00.000Z'
  )
})
