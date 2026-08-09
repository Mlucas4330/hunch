import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { stripeEvents, subscriptions, users } from '@/db/schema'
import { stripe, planForPriceId } from '@/lib/stripe'
import { isUuid } from '@/lib/uuid'
import { SUBSCRIPTION_PLAN } from '@/lib/enums'
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/enums'

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  return 'canceled'
}

function planFromSubscription(subscription: Stripe.Subscription): SubscriptionPlan | undefined {
  const metadataPlan = subscription.metadata?.plan
  if (metadataPlan && SUBSCRIPTION_PLAN.includes(metadataPlan as SubscriptionPlan)) {
    return metadataPlan as SubscriptionPlan
  }
  const priceId = subscription.items.data[0]?.price.id
  return priceId ? planForPriceId(priceId) : undefined
}

function customerIdOf(subscription: Stripe.Subscription): string | null {
  if (typeof subscription.customer === 'string') return subscription.customer
  return subscription.customer?.id ?? null
}

async function payerEmail(customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return customer.deleted ? null : customer.email
  } catch {
    return null
  }
}

async function userIdForSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  const customerId = customerIdOf(subscription)

  if (customerId) {
    const owner = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, customerId),
      columns: { id: true }
    })
    if (owner) return owner.id
  }

  const metadataUserId = subscription.metadata?.userId
  if (isUuid(metadataUserId)) {
    const claimed = await db.query.users.findFirst({
      where: eq(users.id, metadataUserId),
      columns: { id: true }
    })
    if (claimed) return claimed.id
  }

  if (customerId) {
    const email = await payerEmail(customerId)
    if (email) {
      const payer = await db.query.users.findFirst({
        where: sql`lower(${users.email}) = ${email.toLowerCase()}`,
        columns: { id: true }
      })
      if (payer) return payer.id
    }
  }

  return null
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

  const customerId = customerIdOf(subscription)
  await db
    .update(users)
    .set(customerId ? { plan, stripeCustomerId: customerId } : { plan })
    .where(eq(users.id, userId))
}

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
