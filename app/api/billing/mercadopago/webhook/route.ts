import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { paymentEvents, users } from '@/db/schema'
import {
  MERCADOPAGO_APPROVED,
  MERCADOPAGO_PAYMENT_TOPIC,
  MERCADOPAGO_PREAPPROVAL_TOPIC,
  MERCADOPAGO_PROVIDER,
  MERCADOPAGO_SUBSCRIPTION_PAYMENT_TOPIC
} from '@/lib/constants'
import { grantCredits } from '@/lib/credits'
import {
  creditsForAmount,
  creditsForRenewal,
  getAuthorizedPayment,
  getPayment,
  getPreapproval,
  verifyWebhookSignature,
  type MercadoPagoPayment
} from '@/lib/mercadopago'
import { recordSubscription } from '@/lib/subscriptions'
import { isSubscriptionStatus } from '@/lib/enums'
import { log } from '@/lib/log'

// Same two guards as the Stripe webhook, for the same two different jobs. `payment_events` claims
// the delivery so a retry does no work twice; the unique on `(provider, provider_ref)` in the ledger
// claims the payment itself, and that one is the guarantee that matters.
//
// The claim is keyed on the payment id **and the notification type**: a Pix payment notifies once
// while it is pending and again once it is approved, and collapsing those two onto one key would
// throw away the delivery that carries the money.
async function claimEvent(paymentId: string, type: string): Promise<boolean> {
  const inserted = await db
    .insert(paymentEvents)
    .values({
      provider: MERCADOPAGO_PROVIDER,
      eventId: `${paymentId}:${type}`,
      type,
      eventCreatedAt: new Date()
    })
    .onConflictDoNothing()
    .returning({ eventId: paymentEvents.eventId })

  return inserted.length > 0
}

// The Mercado Pago adapter, and the whole of it: work out who paid and what they bought, then hand
// it to the one internal path that moves a balance.
async function creditFromPayment(payment: MercadoPagoPayment): Promise<void> {
  if (payment.status !== MERCADOPAGO_APPROVED) return

  // Read back from the amount the provider says was charged, matched against our own map. Nothing
  // the buyer's browser sent decides this -- see lib/mercadopago.ts.
  const credits = creditsForAmount(payment.transaction_amount)
  if (credits <= 0) {
    console.error('[billing/mercadopago] approved payment matched no pack', {
      payment: payment.id,
      amount: payment.transaction_amount
    })
    return
  }

  if (!payment.external_reference) {
    console.error('[billing/mercadopago] approved payment with no reference', payment.id)
    return
  }

  const buyer = await db.query.users.findFirst({
    where: eq(users.id, payment.external_reference),
    columns: { email: true }
  })

  if (!buyer) {
    console.error('[billing/mercadopago] reference points at no user', payment.external_reference)
    return
  }

  const result = await grantCredits({
    email: buyer.email,
    credits,
    provider: MERCADOPAGO_PROVIDER,
    providerRef: String(payment.id),
    // The amount the provider confirmed, not the one the pack map holds -- they agree, because
    // `creditsForAmount` just refused everything where they would not, and reporting the confirmed
    // figure keeps that true by construction rather than by two constants staying in step.
    amountBrl: payment.transaction_amount
  })

  console.info('[billing/mercadopago] credit grant', { payment: payment.id, credits, ...result })
}

/**
 * Records what the provider says an authorisation is now doing.
 *
 * **It grants nothing**, which is what keeps a cancellation from crediting anybody. The money for a
 * subscription arrives on its own topic, one charge at a time.
 */
async function syncPreapproval(preapprovalId: string): Promise<void> {
  const preapproval = await getPreapproval(preapprovalId)

  if (!preapproval.external_reference) {
    log.error('subscription.unmatched', undefined, { preapproval: preapprovalId })
    return
  }

  // An unknown status is not a reason to guess. Leaving the row as it was is the safe direction:
  // the worst case is a subscriber whose sweep keeps running for one more cycle, where writing a
  // guessed `authorized` would sweep for someone who cancelled.
  if (!isSubscriptionStatus(preapproval.status)) {
    log.warn('subscription.status_changed', {
      preapproval: preapprovalId,
      status: preapproval.status,
      stored: false
    })
    return
  }

  await recordSubscription({
    userId: preapproval.external_reference,
    provider: MERCADOPAGO_PROVIDER,
    providerRef: preapproval.id,
    status: preapproval.status,
    currentPeriodEnd: preapproval.next_payment_date
      ? new Date(preapproval.next_payment_date)
      : null
  })

  log.info('subscription.status_changed', {
    preapproval: preapprovalId,
    status: preapproval.status,
    stored: true
  })
}

/**
 * Credits one charge made against an authorisation.
 *
 * **Keyed on the charge, never on the subscription.** `providerRef` is this payment's own id, so
 * every month claims its own ledger row; keying it on the preapproval would credit the first month
 * and silently swallow all of them after it, which is the failure that looks exactly like working
 * software for thirty days.
 *
 * The amount is matched against `MONITORING_PLAN` on the way back for the same reason a pack's is:
 * a charge for an amount we do not sell buys nothing.
 */
async function creditFromRenewal(authorizedPaymentId: string): Promise<void> {
  const payment = await getAuthorizedPayment(authorizedPaymentId)
  if (payment.status !== MERCADOPAGO_APPROVED) return

  const credits = creditsForRenewal(payment.transaction_amount)
  if (credits <= 0) {
    log.error('subscription.unmatched', undefined, {
      payment: payment.id,
      amount: payment.transaction_amount
    })
    return
  }

  const preapproval = await getPreapproval(payment.preapproval_id)
  if (!preapproval.external_reference) {
    log.error('subscription.unmatched', undefined, { preapproval: payment.preapproval_id })
    return
  }

  const subscriber = await db.query.users.findFirst({
    where: eq(users.id, preapproval.external_reference),
    columns: { email: true }
  })

  if (!subscriber) {
    log.error('subscription.unmatched', undefined, { user: preapproval.external_reference })
    return
  }

  const result = await grantCredits({
    email: subscriber.email,
    credits,
    provider: MERCADOPAGO_PROVIDER,
    providerRef: String(payment.id),
    // Every renewal reports, not only the first. A subscription is what makes a paid channel pay for
    // itself -- see docs/product.md -- so bidding against the first month alone would understate the
    // channel by exactly the amount that justifies it.
    amountBrl: payment.transaction_amount
  })

  // A paid renewal is also the provider confirming the authorisation is live, so the row is brought
  // up to date here rather than waiting for a `preapproval` delivery that may not come.
  await recordSubscription({
    userId: preapproval.external_reference,
    provider: MERCADOPAGO_PROVIDER,
    providerRef: payment.preapproval_id,
    status: 'authorized',
    currentPeriodEnd: preapproval.next_payment_date
      ? new Date(preapproval.next_payment_date)
      : null
  })

  log.info('subscription.renewed', { payment: payment.id, credits, ...result })
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
    type === MERCADOPAGO_PAYMENT_TOPIC ||
    type === MERCADOPAGO_PREAPPROVAL_TOPIC ||
    type === MERCADOPAGO_SUBSCRIPTION_PAYMENT_TOPIC

  if (!handled) return NextResponse.json({ received: true, ignored: true })

  if (!(await claimEvent(dataId, type))) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    if (type === MERCADOPAGO_PAYMENT_TOPIC) await creditFromPayment(await getPayment(dataId))
    else if (type === MERCADOPAGO_PREAPPROVAL_TOPIC) await syncPreapproval(dataId)
    else await creditFromRenewal(dataId)
  } catch (error) {
    // The claim is released before answering 500, and that release is the point. A claim that
    // outlives a failed handling turns every retry into a `duplicate` that does nothing, which is
    // how a paid credit goes missing for good. Releasing it costs nothing: a duplicate that gets
    // through anyway still cannot credit twice, because the ledger's unique is keyed on the payment.
    await db
      .delete(paymentEvents)
      .where(
        and(
          eq(paymentEvents.provider, MERCADOPAGO_PROVIDER),
          eq(paymentEvents.eventId, `${dataId}:${type}`)
        )
      )

    console.error('[billing/mercadopago] handling failed', error)
    return NextResponse.json({ error: 'handling_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
