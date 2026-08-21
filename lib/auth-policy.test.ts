import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { isAdmin, isAdminEmail } from './auth-policy'
import { ADMIN_ROLE, DEFAULT_USER_ROLE } from './constants'

const original = process.env.ADMIN_EMAIL

afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_EMAIL
  else process.env.ADMIN_EMAIL = original
})

test('matches the configured address', () => {
  process.env.ADMIN_EMAIL = 'ada@example.com'
  assert.equal(isAdminEmail('ada@example.com'), true)
})

test('case is not identity', () => {
  process.env.ADMIN_EMAIL = 'Ada@Example.com'
  assert.equal(isAdminEmail('ada@example.com'), true)

  process.env.ADMIN_EMAIL = 'ada@example.com'
  assert.equal(isAdminEmail('ADA@EXAMPLE.COM'), true)
})

test('a pasted value that kept its whitespace still matches', () => {
  process.env.ADMIN_EMAIL = '  ada@example.com '
  assert.equal(isAdminEmail('ada@example.com'), true)
})

test('a different address is still refused', () => {
  process.env.ADMIN_EMAIL = 'ada@example.com'
  assert.equal(isAdminEmail('grace@example.com'), false)
  assert.equal(isAdminEmail('ada@example.com.evil.test'), false)
  assert.equal(isAdminEmail('adaa@example.com'), false)
})

test('no ADMIN_EMAIL grants nobody', () => {
  delete process.env.ADMIN_EMAIL
  assert.equal(isAdminEmail('ada@example.com'), false)

  process.env.ADMIN_EMAIL = ''
  assert.equal(isAdminEmail('ada@example.com'), false)
})

test('an absent address is never the admin', () => {
  process.env.ADMIN_EMAIL = 'ada@example.com'
  assert.equal(isAdminEmail(null), false)
  assert.equal(isAdminEmail(undefined), false)
  assert.equal(isAdminEmail(''), false)
})

// The other half of the rule: the variable grants, the stored row authorizes.
test('the gate reads the row, never the variable', () => {
  process.env.ADMIN_EMAIL = 'ada@example.com'
  assert.equal(isAdmin({ role: ADMIN_ROLE }), true)
  assert.equal(isAdmin({ role: DEFAULT_USER_ROLE }), false)
  assert.equal(isAdmin(null), false)
})
