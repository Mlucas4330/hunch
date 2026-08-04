import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { stripeEvents, subscriptions, users } from '@/db/schema'
import { stripe, planForPriceId } from '@/lib/stripe'
import { SUBSCRIPTION_PLAN } from '@/lib/enums'
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/enums'

// Excluded from auth middleware -- Stripe calls this directly.

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  return 'canceled'
}

// metadata is writable from the Stripe dashboard, so it is a hint about which plan was bought, not
// an authority on it. An unrecognised value falls through to the price id, which we control.
function planFromSubscription(subscription: Stripe.Subscription): SubscriptionPlan | undefined {
  const metadataPlan = subscription.metadata?.plan
  if (metadataPlan && SUBSCRIPTION_PLAN.includes(metadataPlan as SubscriptionPlan)) {
    return metadataPlan as SubscriptionPlan
  }
  const priceId = subscription.items.data[0]?.price.id
  return priceId ? planForPriceId(priceId) : undefined
}

// Resolves the user from the Stripe customer rather than from metadata.userId alone: the customer
// id is what we recorded at checkout, so it cannot be pointed at someone else's account.
async function userIdForSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

  if (customerId) {
    const owner = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, customerId),
      columns: { id: true }
    })
    if (owner) return owner.id
  }

  const metadataUserId = subscription.metadata?.userId
  if (!metadataUserId) return null

  const claimed = await db.query.users.findFirst({
    where: eq(users.id, metadataUserId),
    columns: { id: true }
  })
  return claimed?.id ?? null
}

async function syncSubscription(subscription: Stripe.Subscription, plan: SubscriptionPlan) {
  const userId = await userIdForSubscription(subscription)
  if (!userId) {
    console.error('[billing/webhook] no user for subscription', subscription.id)
    return
  }

  const item = subscription.items.data[0]
  const status = mapStatus(subscription.status)
  const currentPeriodEnd = new Date(item.current_period_end * 1000)

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeSubscriptionId: subscription.id,
      plan,
      status,
      currentPeriodEnd
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: { plan, status, currentPeriodEnd }
    })

  await db.update(users).set({ plan }).where(eq(users.id, userId))
}

// Records the event and reports whether this delivery is the first one. Stripe retries until it
// gets a 2xx, so without this a retry re-runs the whole handler.
async function claimEvent(event: Stripe.Event, subscriptionId: string | null): Promise<boolean> {
  const inserted = await db
    .insert(stripeEvents)
    .values({
      id: event.id,
      type: event.type,
      subscriptionId,
      eventCreatedAt: new Date(event.created * 1000)
    })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id })

  return inserted.length > 0
}

// Guards ordering, which idempotency alone does not: a `subscription.updated` delayed past this
// subscription's `subscription.deleted` would otherwise re-grant the plan the deletion revoked.
async function supersededByCancellation(
  event: Stripe.Event,
  subscriptionId: string
): Promise<boolean> {
  const [cancellation] = await db
    .select({ eventCreatedAt: stripeEvents.eventCreatedAt })
    .from(stripeEvents)
    .where(
      and(
        eq(stripeEvents.subscriptionId, subscriptionId),
        eq(stripeEvents.type, 'customer.subscription.deleted')
      )
    )
    .orderBy(desc(stripeEvents.eventCreatedAt))
    .limit(1)

  if (!cancellation) return false
  return event.created * 1000 < cancellation.eventCreatedAt.getTime()
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

  const subscriptionId = subscriptionIdOf(event)

  // Claimed before any work is done, so a retry of a partially-applied event is still a no-op.
  if (!(await claimEvent(event, subscriptionId))) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const plan = planFromSubscription(subscription)
        if (plan && !(await supersededByCancellation(event, subscription.id))) {
          await syncSubscription(subscription, plan)
        }
      }
      break
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object
      const plan = planFromSubscription(subscription)
      if (plan && !(await supersededByCancellation(event, subscription.id))) {
        await syncSubscription(subscription, plan)
      }
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      await db
        .update(subscriptions)
        .set({ status: 'canceled' })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

      const userId = await userIdForSubscription(subscription)
      if (userId) {
        await db.update(users).set({ plan: 'free' }).where(eq(users.id, userId))
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

function subscriptionIdOf(event: Stripe.Event): string | null {
  if (event.type === 'checkout.session.completed') {
    const value = event.data.object.subscription
    return typeof value === 'string' ? value : (value?.id ?? null)
  }
  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    return event.data.object.id
  }
  return null
}
