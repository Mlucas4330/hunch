import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dueStep, selectDue } from '@/lib/lead-sequence'
import { hashEmail } from '@/lib/google-ads-audience'

const NOW = new Date('2026-09-10T12:00:00Z')

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)
}

function lead(overrides: Partial<Parameters<typeof dueStep>[0]> = {}) {
  return {
    stage: 0,
    unsubscribedAt: null,
    consentedAt: daysAgo(3),
    createdAt: daysAgo(3),
    ...overrides
  }
}

test('a row younger than the first step is not due', () => {
  assert.equal(dueStep(lead({ createdAt: daysAgo(1) }), NOW), null)
})

test('day two earns the measurement mail', () => {
  assert.equal(dueStep(lead({ createdAt: daysAgo(2) }), NOW)?.kind, 'measurement')
})

test('a row that already had the measurement waits for day seven', () => {
  assert.equal(dueStep(lead({ stage: 1, createdAt: daysAgo(3) }), NOW), null)
  assert.equal(dueStep(lead({ stage: 1, createdAt: daysAgo(7) }), NOW)?.kind, 'offer')
})

test('a row that went quiet gets the later mail, never the backlog', () => {
  // Twenty days old and due both. Sending the day-2 measurement now would be a mail about a page
  // they stopped thinking about a fortnight ago.
  const step = dueStep(lead({ createdAt: daysAgo(20) }), NOW)
  assert.equal(step?.kind, 'offer')
})

test('the sequence ends after the last step', () => {
  assert.equal(dueStep(lead({ stage: 2, createdAt: daysAgo(60) }), NOW), null)
})

test('unsubscribing stops it, whatever the row is owed', () => {
  assert.equal(dueStep(lead({ createdAt: daysAgo(30), unsubscribedAt: daysAgo(1) }), NOW), null)
})

test('a row captured before the current note is never enrolled', () => {
  // The whole point of the column: the form promised one mail and nothing else, and a policy that
  // changed afterwards does not reach backwards.
  assert.equal(dueStep(lead({ consentedAt: null, createdAt: daysAgo(30) }), NOW), null)
})

function row(email: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `${email}-${String(overrides.createdAt ?? 'a')}`,
    email,
    stage: 0,
    unsubscribedAt: null,
    consentedAt: daysAgo(10),
    lastEmailedAt: null,
    createdAt: daysAgo(10),
    ...overrides
  }
}

test('one address is mailed once per run, however many reports it left', () => {
  const picked = selectDue(
    [row('a@example.com', { createdAt: daysAgo(9) }), row('a@example.com', { createdAt: daysAgo(10) })],
    NOW
  )

  assert.equal(picked.length, 1)
  // The older row wins: the report they asked about first is the one they hear about.
  assert.equal(picked[0].lead.createdAt.getTime(), daysAgo(10).getTime())
})

test('an address mailed yesterday is left alone even on a different report', () => {
  const picked = selectDue(
    [
      row('a@example.com', { lastEmailedAt: daysAgo(0.5), stage: 1 }),
      row('a@example.com', { createdAt: daysAgo(11) })
    ],
    NOW
  )

  assert.equal(picked.length, 0)
})

test('the batch size is a ceiling', () => {
  const rows = Array.from({ length: 5 }, (_, index) =>
    row(`person${index}@example.com`, { createdAt: daysAgo(10 + index) })
  )

  assert.equal(selectDue(rows, NOW, 2).length, 2)
})

test('the address is normalised before it is hashed, because Google normalises too', () => {
  const expected = hashEmail('person@example.com')

  assert.equal(hashEmail('  Person@Example.COM  '), expected)
  assert.equal(expected.length, 64)
  assert.notEqual(expected, 'person@example.com')
})
