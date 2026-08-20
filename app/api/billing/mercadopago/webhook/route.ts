import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { paymentEvents, users } from '@/db/schema'
import {
  MERCADOPAGO_APPROVED,
  MERCADOPAGO_PAYMENT_TOPIC,
  MERCADOPAGO_PROVIDER
} from '@/lib/constants'
import { grantCredits } from '@/lib/credits'
import {
  creditsForAmount,
  getPayment,
  verifyWebhookSignature,
  type MercadoPagoPayment
} from '@/lib/mercadopago'

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
    providerRef: String(payment.id)
  })

  console.info('[billing/mercadopago] credit grant', { payment: payment.id, credits, ...result })
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

  if (type !== MERCADOPAGO_PAYMENT_TOPIC) return NextResponse.json({ received: true, ignored: true })

  if (!(await claimEvent(dataId, type))) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    await creditFromPayment(await getPayment(dataId))
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
