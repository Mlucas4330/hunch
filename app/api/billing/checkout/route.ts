import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { stripe, priceIdForPlan } from '@/lib/stripe'
import { SUBSCRIPTION_PLAN } from '@/lib/enums'

const PAID_PLANS = SUBSCRIPTION_PLAN.filter((plan) => plan !== 'free')

const BodySchema = z.object({
  plan: z.enum(PAID_PLANS as [string, ...string[]])
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_plan' }, { status: 422 })

  const plan = parsed.data.plan as (typeof PAID_PLANS)[number]
  const price = priceIdForPlan(plan)
  if (!price) return NextResponse.json({ error: 'billing_unconfigured' }, { status: 500 })

  try {
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name })
      customerId = customer.id
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id))
    }

    const origin = new URL(request.url).origin
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      return_url: `${origin}/billing?checkout=complete&session_id={CHECKOUT_SESSION_ID}`,
      metadata: { userId: user.id, plan },
      subscription_data: { metadata: { userId: user.id, plan } }
    })

    return NextResponse.json({ client_secret: session.client_secret })
  } catch {
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 })
  }
}
