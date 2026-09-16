import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { paymentEvents, users } from '@/db/schema'
import {
  MERCADOPAGO_AUTHORIZED,
  MERCADOPAGO_PREAPPROVAL_TOPIC,
  MERCADOPAGO_PROVIDER,
  MERCADOPAGO_SUBSCRIPTION_PAYMENT_TOPIC,
  planTierForAmount
} from '@/lib/constants'
import { isSubscriptionStatus } from '@/lib/enums'
import { log } from '@/lib/log'
import {
  getAuthorizedPayment,
  getPreapproval,
  verifyWebhookSignature,
  type MercadoPagoPreapproval
} from '@/lib/mercadopago'
import { applySubscribedTier } from '@/lib/quota'
import { recordSubscription } from '@/lib/subscriptions'

export const runtime = 'nodejs'

/**
 * What Mercado Pago says happened to a subscription.
 *
 * **Unauthenticated by design and signed instead**: it is called by the provider, which has no
 * session, so `verifyWebhookSignature` is the whole of its authorization and every failure of it
 * refuses. See docs/security.md.
 */

// The delivery claim, so a retry does no work twice. Keyed on the id **and** the type, because one
// subscription notifies under both topics and collapsing them onto one key would throw away the
// delivery that carries the renewal.
async function claimEvent(dataId: string, type: string): Promise<boolean> {
  const inserted = await db
    .insert(paymentEvents)
    .values({ provider: MERCADOPAGO_PROVIDER, eventId: `${dataId}:${type}`, type })
    .onConflictDoNothing()
    .returning({ eventId: paymentEvents.eventId })

  return inserted.length > 0
}

async function releaseEvent(dataId: string, type: string): Promise<void> {
  await db
    .delete(paymentEvents)
    .where(
      and(
        eq(paymentEvents.provider, MERCADOPAGO_PROVIDER),
        eq(paymentEvents.eventId, `${dataId}:${type}`)
      )
    )
}

/**
 * Applies what the provider confirmed about one authorisation.
 *
 * The tier is read back from the amount the provider says it is billing, matched against our own
 * map, so nothing a browser sent decides what was bought. An amount matching no tier writes nothing
 * and logs: it is either a price we have retired or a subscription that is not ours.
 */
async function syncPreapproval(preapproval: MercadoPagoPreapproval): Promise<void> {
  const userId = preapproval.external_reference

  if (!userId) {
    log.warn('subscription.unmatched', { preapproval: preapproval.id, reason: 'no_reference' })
    return
  }

  const buyer = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true }
  })

  if (!buyer) {
    log.warn('subscription.unmatched', { preapproval: preapproval.id, reason: 'no_user' })
    return
  }

  const amount = preapproval.auto_recurring?.transaction_amount
  const tier = amount === undefined ? null : planTierForAmount(amount)

  if (!tier) {
    log.warn('subscription.unmatched', { preapproval: preapproval.id, reason: 'no_tier', amount })
    return
  }

  const status = isSubscriptionStatus(preapproval.status) ? preapproval.status : 'pending'

  await recordSubscription({
    userId: buyer.id,
    provider: MERCADOPAGO_PROVIDER,
    providerRef: preapproval.id,
    status,
    tier,
    currentPeriodEnd: preapproval.next_payment_date
      ? new Date(preapproval.next_payment_date)
      : null
  })

  // **Only an authorisation writes a quota, and it writes an absolute number.** A cancellation
  // leaves the quota alone: the month already paid for is honoured, and `quotaFor` stops reading the
  // entitlement once `current_period_end` passes. See docs/invariants.md.
  if (status === MERCADOPAGO_AUTHORIZED) await applySubscribedTier(buyer.id, tier)

  log.info('subscription.status_changed', { user: buyer.id, status, tier })
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const body = (await request.json().catch(() => null)) as {
    type?: string
    data?: { id?: string }
  } | null

  // The id arrives in the query string on some deliveries and in the body on others, and the
  // signature is computed over whichever one was sent.
  const dataId = url.searchParams.get('data.id') ?? body?.data?.id ?? null
  const type = body?.type ?? url.searchParams.get('type') ?? ''

  const verified = verifyWebhookSignature({
    signature: request.headers.get('x-signature'),
    requestId: request.headers.get('x-request-id'),
    dataId,
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET
  })

  if (!verified || !dataId) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  const handled =
    type === MERCADOPAGO_PREAPPROVAL_TOPIC || type === MERCADOPAGO_SUBSCRIPTION_PAYMENT_TOPIC

  // Nothing is sold as a one-off, so every other topic is acknowledged and ignored.
  if (!handled) return NextResponse.json({ received: true, ignored: true })

  if (!(await claimEvent(dataId, type))) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    if (type === MERCADOPAGO_PREAPPROVAL_TOPIC) {
      await syncPreapproval(await getPreapproval(dataId))
    } else {
      // A renewal names a charge, not the subscription. Reading the authorisation it belongs to is
      // what refreshes the period end, and it keeps one path that writes entitlement.
      const payment = await getAuthorizedPayment(dataId)
      await syncPreapproval(await getPreapproval(payment.preapproval_id))
      log.info('subscription.renewed', { preapproval: payment.preapproval_id })
    }
  } catch (error) {
    // The claim is released before answering 500, and that release is the point: a claim that
    // outlives a failed handling turns every retry into a `duplicate` that does nothing, which is
    // how a paid subscription silently never lands.
    await releaseEvent(dataId, type)

    log.error('subscription.created_failed', error, { delivery: dataId, type })
    return NextResponse.json({ error: 'handling_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
