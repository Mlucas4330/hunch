import { createHmac } from 'node:crypto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CREDIT_PACKS } from '@/lib/constants'
import { creditsForAmount, verifyWebhookSignature } from '@/lib/mercadopago'

const SECRET = 'a-webhook-secret'
const DATA_ID = '1234567890'
const REQUEST_ID = 'b7a1c0de-0000-4000-8000-000000000000'
const TS = '1704908010'

function signatureFor({
  dataId = DATA_ID,
  requestId = REQUEST_ID,
  ts = TS,
  secret = SECRET
} = {}): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  return `ts=${ts},v1=${createHmac('sha256', secret).update(manifest).digest('hex')}`
}

test('an amount buys exactly the pack it matches', () => {
  for (const pack of CREDIT_PACKS) {
    assert.equal(creditsForAmount(pack.amountBrl), pack.credits)
  }
})

test('an amount matching no pack buys nothing', () => {
  assert.equal(creditsForAmount(1), 0)
  assert.equal(creditsForAmount(0), 0)
  assert.equal(creditsForAmount(19.5), 0)
})

// The prices a payment could have been created against before the repricing. A stale checkout that
// somehow still charges one of them grants nothing rather than guessing what it was meant to buy,
// which is the same direction `creditsForAmount` already refuses in.
test('a retired price buys nothing', () => {
  for (const amount of [19, 39, 99, 97]) {
    assert.equal(creditsForAmount(amount), 0, `R$${amount} is no longer a pack`)
  }
})

test('a signature over the right manifest verifies', () => {
  assert.equal(
    verifyWebhookSignature({
      signature: signatureFor(),
      requestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET
    }),
    true
  )
})

test('every altered field refuses', () => {
  const cases: Array<[string, Parameters<typeof verifyWebhookSignature>[0]]> = [
    [
      'a different payment id',
      {
        signature: signatureFor(),
        requestId: REQUEST_ID,
        dataId: '9999999999',
        secret: SECRET
      }
    ],
    [
      'a different request id',
      { signature: signatureFor(), requestId: 'someone-else', dataId: DATA_ID, secret: SECRET }
    ],
    [
      'a replayed timestamp',
      {
        signature: signatureFor().replace(`ts=${TS}`, 'ts=1704908011'),
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: SECRET
      }
    ],
    [
      'a signature from another secret',
      {
        signature: signatureFor({ secret: 'not-our-secret' }),
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: SECRET
      }
    ],
    [
      'no header at all',
      { signature: null, requestId: REQUEST_ID, dataId: DATA_ID, secret: SECRET }
    ],
    [
      'a header with no v1',
      { signature: `ts=${TS}`, requestId: REQUEST_ID, dataId: DATA_ID, secret: SECRET }
    ],
    [
      'no secret configured',
      { signature: signatureFor(), requestId: REQUEST_ID, dataId: DATA_ID, secret: undefined }
    ]
  ]

  for (const [name, input] of cases) {
    assert.equal(verifyWebhookSignature(input), false, name)
  }
})
