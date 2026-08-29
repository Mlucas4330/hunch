import { createHmac, timingSafeEqual } from 'node:crypto'
import { CREDIT_PACKS } from '@/lib/constants'

/**
 * The Mercado Pago adapter's own half: the client, the price map and the signature check. What it
 * does with a confirmed payment is `grantCredits`, and nothing here touches a credit table -- see
 * lib/credits.ts for why that separation is load bearing.
 *
 * Called over `fetch` rather than through the official SDK. The two things needed from it are one
 * POST, one GET and an HMAC we compute ourselves, and a dependency that ships a whole client for
 * that is a dependency to keep updated for no gain.
 */

const API_ORIGIN = 'https://api.mercadopago.com'

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

if (!accessToken) {
  console.warn('MERCADOPAGO_ACCESS_TOKEN is not set -- payments and the webhook cannot work')
}

/**
 * Whether the Brick can be offered at all. Both halves of the credential pair have to be present:
 * the public key alone renders a form no payment can be created from, and the token alone renders
 * nothing.
 */
export function mercadoPagoEnabled(): boolean {
  return Boolean(accessToken && process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY)
}

export type MercadoPagoPayment = {
  id: number
  status: string
  status_detail: string
  transaction_amount: number
  external_reference: string | null
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
      ticket_url?: string
    }
  }
}

// A refused call answers a body naming the field it refused, and that body used to be dropped on the
// floor: every failure surfaced as a bare status code, so "the checkout button returns 502" was
// as much as anyone could learn from a log. Cheap to keep, and it is the whole difference between a
// guess and a diagnosis. Capped because it is going into a log line, not a report.
const ERROR_BODY_MAX_CHARS = 500

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken ?? ''}`,
      'Content-Type': 'application/json',
      ...init.headers
    }
  })

  if (!response.ok) {
    // Read defensively: the failure being reported is the status, and a body that will not read
    // must not replace it with a parsing error.
    const detail = await response.text().catch(() => '')

    throw new Error(
      `mercadopago ${init.method ?? 'GET'} ${path} answered ${response.status}: ${detail.slice(0, ERROR_BODY_MAX_CHARS)}`
    )
  }

  return response.json() as Promise<T>
}

/**
 * Creates the payment the Brick collected.
 *
 * `idempotencyKey` is the provider's own guard against a double submit: the same key replays the
 * first answer instead of charging twice.
 */
export async function createPayment(
  body: Record<string, unknown>,
  idempotencyKey: string
): Promise<MercadoPagoPayment> {
  return call<MercadoPagoPayment>('/v1/payments', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body)
  })
}

/**
 * Reads a payment back from the provider.
 *
 * **The webhook grants on this and never on the notification body.** A notification is an unsigned
 * claim that something happened to an id; the payment's status and amount are only true as the API
 * reports them.
 */
export async function getPayment(id: string): Promise<MercadoPagoPayment> {
  return call<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(id)}`, { method: 'GET' })
}

/**
 * How many credits an amount is worth.
 *
 * The analogue of `creditsForPrice` in lib/stripe.ts, and it carries the same rule for the harder
 * case. Stripe holds the amount behind a price id on its own servers; the Payment Brick hands the
 * browser a form whose `transaction_amount` the caller can edit before it is submitted. **So the
 * amount is read from our own map on the way in and matched against it again on the way back**, and
 * an amount that matches no pack buys nothing.
 */
export function creditsForAmount(amount: number): number {
  return CREDIT_PACKS.find((pack) => pack.amountBrl === amount)?.credits ?? 0
}

/**
 * Verifies the `x-signature` header against the shared secret.
 *
 * The signed manifest is `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, where `ts` and `v1` are
 * the two fields of the header itself. Anything missing or malformed refuses: a webhook that cannot
 * be proven to come from the provider is a stranger asking us to credit an account.
 */
export function verifyWebhookSignature({
  signature,
  requestId,
  dataId,
  secret
}: {
  signature: string | null
  requestId: string | null
  dataId: string | null
  secret: string | undefined
}): boolean {
  if (!signature || !dataId || !secret) return false

  const parts = new Map(
    signature.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key?.trim() ?? '', value?.trim() ?? '']
    })
  )

  const ts = parts.get('ts')
  const received = parts.get('v1')
  if (!ts || !received) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId ?? ''};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(received, 'utf8')

  return a.length === b.length && timingSafeEqual(a, b)
}
