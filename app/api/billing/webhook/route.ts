import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { subscriptions, users } from '@/db/schema'
import { stripe, planForPriceId } from '@/lib/stripe'
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/enums'

// Excluded from auth middleware -- Stripe calls this directly.

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  return 'canceled'
}

function planFromSubscription(subscription: Stripe.Subscription): SubscriptionPlan | undefined {
  const metadataPlan = subscription.metadata?.plan as SubscriptionPlan | undefined
  if (metadataPlan) return metadataPlan
  const priceId = subscription.items.data[0]?.price.id
  return priceId ? planForPriceId(priceId) : undefined
}

async function syncSubscription(subscription: Stripe.Subscription, plan: SubscriptionPlan) {
  const item = subscription.items.data[0]
  const status = mapStatus(subscription.status)
  const currentPeriodEnd = new Date(item.current_period_end * 1000)

  const [row] = await db
    .insert(subscriptions)
    .values({
      userId: subscription.metadata.userId,
      stripeSubscriptionId: subscription.id,
      plan,
      status,
      currentPeriodEnd
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: { plan, status, currentPeriodEnd }
    })
    .returning()

  await db.update(users).set({ plan }).where(eq(users.id, row.userId))
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

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const plan = planFromSubscription(subscription)
        if (plan) await syncSubscription(subscription, plan)
      }
      break
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object
      const plan = planFromSubscription(subscription)
      if (plan) await syncSubscription(subscription, plan)
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      await db
        .update(subscriptions)
        .set({ status: 'canceled' })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      const userId = subscription.metadata?.userId
      if (userId) {
        await db.update(users).set({ plan: 'free' }).where(eq(users.id, userId))
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
