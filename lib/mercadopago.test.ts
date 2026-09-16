import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { verifyWebhookSignature } from './mercadopago'
import { PLAN, planTierForAmount } from './constants'

// The webhook has no session behind it, so the signature is the whole of its authorization. Every
// way of failing to prove the delivery came from Mercado Pago has to refuse.

const SECRET = 'whsec_test'
const DATA_ID = '1234567890'
const REQUEST_ID = 'req-abc'
const TS = '1700000000'

function sign(secret: string, dataId = DATA_ID, requestId = REQUEST_ID, ts = TS): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  return `ts=${ts},v1=${createHmac('sha256', secret).update(manifest).digest('hex')}`
}

test('a delivery signed with the shared secret is accepted', () => {
  assert.equal(
    verifyWebhookSignature({
      signature: sign(SECRET),
      requestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET
    }),
    true
  )
})

test('the id is matched case insensitively, because the provider sends it either way', () => {
  assert.equal(
    verifyWebhookSignature({
      signature: sign(SECRET, 'ABCDEF'),
      requestId: REQUEST_ID,
      dataId: 'abcdef',
      secret: SECRET
    }),
    true
  )
})

test('another secret, another request id and another id all refuse', () => {
  assert.equal(
    verifyWebhookSignature({
      signature: sign('whsec_other'),
      requestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET
    }),
    false
  )

  assert.equal(
    verifyWebhookSignature({
      signature: sign(SECRET),
      requestId: 'req-different',
      dataId: DATA_ID,
      secret: SECRET
    }),
    false
  )

  assert.equal(
    verifyWebhookSignature({
      signature: sign(SECRET),
      requestId: REQUEST_ID,
      dataId: '999',
      secret: SECRET
    }),
    false
  )
})

test('a missing header, a missing id and an unset secret refuse rather than pass', () => {
  assert.equal(
    verifyWebhookSignature({ signature: null, requestId: REQUEST_ID, dataId: DATA_ID, secret: SECRET }),
    false
  )

  assert.equal(
    verifyWebhookSignature({ signature: sign(SECRET), requestId: REQUEST_ID, dataId: null, secret: SECRET }),
    false
  )

  assert.equal(
    verifyWebhookSignature({
      signature: sign(SECRET),
      requestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: undefined
    }),
    false
  )
})

test('a malformed header refuses instead of throwing', () => {
  for (const signature of ['', 'garbage', 'ts=1700000000', 'v1=abc', 'ts=,v1=']) {
    assert.equal(
      verifyWebhookSignature({ signature, requestId: REQUEST_ID, dataId: DATA_ID, secret: SECRET }),
      false
    )
  }
})

// What was bought is read back from the amount the provider confirmed, against our own map.

test('each tier is recognised by the price it is sold at', () => {
  assert.equal(planTierForAmount(PLAN.studio.priceBrl), 'studio')
  assert.equal(planTierForAmount(PLAN.agency.priceBrl), 'agency')
  assert.equal(planTierForAmount(PLAN.network.priceBrl), 'network')
})

test('an amount matching no tier buys nothing', () => {
  assert.equal(planTierForAmount(1), null)
  assert.equal(planTierForAmount(0), null)
  assert.equal(planTierForAmount(PLAN.studio.priceBrl - 1), null)
})
