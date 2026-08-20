import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { db } from '@/db'
import { paymentEvents } from '@/db/schema'
import { grantCredits } from '@/lib/credits'
import { STRIPE_PROVIDER } from '@/lib/constants'
import { creditsForPrice, stripe } from '@/lib/stripe'

// Idempotency lives in two places on purpose, and they guard different things.
//
// `payment_events` claims the delivery, so a retried webhook does no work twice. The unique on
// `(provider, provider_ref)` in the ledger claims the payment, so even a delivery that slipped past
// the first guard — a different event id for the same session, a manual replay — cannot credit twice.
// The second one is the guarantee that actually matters, because it is keyed on the payment rather
// than on the message about it.
async function claimEvent(event: Stripe.Event): Promise<boolean> {
  const inserted = await db
    .insert(paymentEvents)
    .values({
      provider: STRIPE_PROVIDER,
      eventId: event.id,
      type: event.type,
      eventCreatedAt: new Date(event.created * 1000)
    })
    .onConflictDoNothing()
    .returning({ eventId: paymentEvents.eventId })

  return inserted.length > 0
}

// The Stripe adapter, and the whole of it: work out who paid and what they bought, then hand it to
// the one internal path that moves a balance. It touches no credit table itself -- see lib/credits.ts
// for why that separation is the load-bearing decision of this phase.
async function creditFromSession(session: Stripe.Checkout.Session): Promise<void> {
  const email = session.customer_details?.email ?? session.customer_email
  if (!email) {
    console.error('[billing/webhook] paid session with no email', session.id)
    return
  }

  const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 })

  // Summed across line items so a quantity of two, or two packs in one basket, is honoured. The
  // price id is the only input: metadata is dashboard-editable and would let credits be minted.
  const credits = items.data.reduce(
    (total, item) => total + creditsForPrice(item.price?.id ?? '') * (item.quantity ?? 1),
    0
  )

  if (credits <= 0) {
    console.error('[billing/webhook] paid session bought no known pack', session.id)
    return
  }

  const result = await grantCredits({
    email,
    credits,
    provider: STRIPE_PROVIDER,
    providerRef: session.id
  })

  console.info('[billing/webhook] credit grant', { session: session.id, credits, ...result })
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !secret) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  if (!(await claimEvent(event))) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      // `complete` is the only status that means the money moved. An expired or open session is a
      // basket nobody paid for.
      if (session.payment_status === 'paid') await creditFromSession(session)
    }
  } catch (error) {
    // Answering 500 makes Stripe retry, and the retry is safe: the ledger's unique on the session id
    // refuses a second grant even though the event claim has already been written.
    console.error('[billing/webhook] handling failed', error)
    return NextResponse.json({ error: 'handling_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
