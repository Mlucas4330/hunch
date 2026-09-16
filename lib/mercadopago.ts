import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * The Mercado Pago adapter: the client, and the signature check on what it sends back.
 *
 * Called over `fetch` rather than through the official SDK. What is needed from the provider is
 * three requests and an HMAC computed here, and a dependency that ships a whole client for that is a
 * dependency to keep updated for no gain.
 *
 * **Nothing in this file writes a quota.** Its whole job is to say what the provider confirmed;
 * `applySubscribedTier` in lib/quota.ts is the one path that moves what an account may run. See
 * docs/api.md.
 */

const API_ORIGIN = 'https://api.mercadopago.com'

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

/**
 * Both halves have to be present. The public key alone renders a card form no subscription can be
 * created from, and the token alone renders no form at all.
 */
export function mercadoPagoEnabled(): boolean {
  return Boolean(accessToken && process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY)
}

/**
 * Whether the configured credentials are the provider's test ones.
 *
 * **A test token creates subscriptions that its own checkout page will not open.** Everything on our
 * side succeeds: the call answers 201, the reader is redirected, and Mercado Pago then says the page
 * does not exist, because the subscription lives in sandbox and the link points at the live site.
 * Nothing in the response says so, which is why it is said here instead.
 */
export function mercadoPagoSandbox(): boolean {
  return accessToken?.startsWith('TEST-') ?? false
}

if (mercadoPagoSandbox()) {
  console.warn(
    '[mercadopago] MERCADOPAGO_ACCESS_TOKEN is a TEST credential, so a checkout opened from here will not load. Production credentials are needed for a subscription anyone can complete.'
  )
}

/**
 * A recurring authorisation. Mercado Pago calls it a preapproval, and it is a different object from
 * a payment: it authorises charges, and each charge it produces is its own authorized payment.
 */
export type MercadoPagoPreapproval = {
  id: string
  status: string
  external_reference: string | null
  init_point?: string
  next_payment_date?: string
  auto_recurring?: { transaction_amount?: number }
}

/**
 * One charge made against a preapproval. The `subscription_authorized_payment` topic carries the id
 * of one of these and never of a plain payment, which is why it needs its own lookup.
 */
export type MercadoPagoAuthorizedPayment = {
  id: number
  status: string
  preapproval_id: string
  transaction_amount: number
}

// A refused call answers a body naming the field it refused, and that body is kept. Dropping it
// leaves every failure as a bare status code, which is the difference between a diagnosis and a
// guess. Capped because it is going into a log line.
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
    // Read defensively: the failure being reported is the status, and a body that will not read must
    // not replace it with a parsing error.
    const detail = await response.text().catch(() => '')

    throw new Error(
      `mercadopago ${init.method ?? 'GET'} ${path} answered ${response.status}: ${detail.slice(0, ERROR_BODY_MAX_CHARS)}`
    )
  }

  return response.json() as Promise<T>
}

/**
 * Opens a recurring authorisation against a card the reader already entered.
 *
 * **It comes back `authorized`, so nothing is pending and nobody is redirected.** The card was
 * tokenized in the browser by the provider's own form, which is why a single-use token is all this
 * server ever sees of it.
 *
 * `idempotencyKey` is the provider's own guard against a double submit: the same key replays the
 * first answer instead of opening a second subscription.
 */
export async function createPreapproval(
  body: Record<string, unknown>,
  idempotencyKey: string
): Promise<MercadoPagoPreapproval> {
  return call<MercadoPagoPreapproval>('/preapproval', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body)
  })
}

/**
 * Reads an authorisation back from the provider.
 *
 * **The webhook acts on this and never on the notification body.** A notification is an unsigned
 * claim that something happened to an id; what state the subscription is in and what it is billed
 * for are only true as the API reports them.
 */
export async function getPreapproval(id: string): Promise<MercadoPagoPreapproval> {
  return call<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(id)}`, { method: 'GET' })
}

export async function getAuthorizedPayment(id: string): Promise<MercadoPagoAuthorizedPayment> {
  return call<MercadoPagoAuthorizedPayment>(
    `/authorized_payments/${encodeURIComponent(id)}`,
    { method: 'GET' }
  )
}

export async function cancelPreapproval(id: string): Promise<void> {
  await call(`/preapproval/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'cancelled' })
  })
}

/**
 * Verifies the `x-signature` header against the shared secret.
 *
 * The signed manifest is `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, where `ts` and `v1` are
 * the two fields of the header itself. Anything missing or malformed refuses: a webhook that cannot
 * be proven to come from the provider is a stranger asking us to hand out a quota.
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
