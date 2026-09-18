import { test } from 'node:test'
import assert from 'node:assert/strict'
import { batchFinished, parseBulkUrls } from './bulk'
import { canBulkGenerate } from './auth-policy'
import { ADMIN_ROLE, BULK_URLS_MAX, DEFAULT_USER_ROLE } from './constants'

// What a pasted list means. Every rule here is one the reader is charged for, so the count the form
// shows and the count the route charges come from this one function.

test('blank lines and surrounding whitespace are dropped', () => {
  const parsed = parseBulkUrls('  https://a.com \n\n\thttps://b.com\n   \n')

  assert.deepEqual(parsed, { ok: true, urls: ['https://a.com', 'https://b.com'] })
})

test('a URL pasted twice is charged once', () => {
  const parsed = parseBulkUrls('https://a.com\nhttps://b.com\nhttps://a.com')

  assert.equal(parsed.ok && parsed.urls.length, 2)
})

test('an empty paste is refused rather than queued', () => {
  assert.deepEqual(parseBulkUrls('   \n\n'), { ok: false, reason: 'empty', count: 0 })
  assert.deepEqual(parseBulkUrls(''), { ok: false, reason: 'empty', count: 0 })
})

test('over the cap the whole list is refused, never trimmed to fit', () => {
  const urls = Array.from({ length: BULK_URLS_MAX + 1 }, (_, i) => `https://site${i}.com`).join('\n')
  const parsed = parseBulkUrls(urls)

  assert.equal(parsed.ok, false)
  assert.deepEqual(parsed, { ok: false, reason: 'too_many', count: BULK_URLS_MAX + 1 })
})

test('exactly the cap is allowed', () => {
  const urls = Array.from({ length: BULK_URLS_MAX }, (_, i) => `https://site${i}.com`).join('\n')

  assert.equal(parseBulkUrls(urls).ok, true)
})

// When a batch is done, computed from the run rows rather than from a counter.

const FINISHED = { finishedAt: new Date(), failedAt: null }
const FAILED = { finishedAt: null, failedAt: new Date() }
const RUNNING = { finishedAt: null, failedAt: null }

test('a batch is finished when every item has settled, failures included', () => {
  assert.equal(batchFinished([FINISHED, FINISHED]), true)
  assert.equal(batchFinished([FINISHED, FAILED]), true)
  assert.equal(batchFinished([FAILED, FAILED]), true)
})

test('one item still running keeps the whole batch running', () => {
  assert.equal(batchFinished([FINISHED, RUNNING]), false)
  assert.equal(batchFinished([RUNNING, FAILED]), false)
})

test('an item with no run yet is still working, not done', () => {
  assert.equal(batchFinished([null]), false)
  assert.equal(batchFinished([FINISHED, null]), false)
})

test('an empty batch is not a finished one', () => {
  assert.equal(batchFinished([]), false)
})

// The tier gate. It reads the stored tier and the stored role, and nothing else.

test('bulk belongs to the two larger tiers', () => {
  assert.equal(canBulkGenerate({ planTier: 'agency', role: DEFAULT_USER_ROLE }), true)
  assert.equal(canBulkGenerate({ planTier: 'network', role: DEFAULT_USER_ROLE }), true)
})

test('studio, no subscription and no user are all refused', () => {
  assert.equal(canBulkGenerate({ planTier: 'studio', role: DEFAULT_USER_ROLE }), false)
  assert.equal(canBulkGenerate({ planTier: null, role: DEFAULT_USER_ROLE }), false)
  assert.equal(canBulkGenerate(null), false)
  assert.equal(canBulkGenerate(undefined), false)
})

test('an admin passes on any tier, including none', () => {
  assert.equal(canBulkGenerate({ planTier: null, role: ADMIN_ROLE }), true)
  assert.equal(canBulkGenerate({ planTier: 'studio', role: ADMIN_ROLE }), true)
})
