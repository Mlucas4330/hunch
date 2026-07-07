import Stripe from 'stripe'
import type { SubscriptionPlan } from '@/lib/enums'

const apiKey = process.env.STRIPE_SECRET_KEY

if (!apiKey) {
  // Allowed at build time / in foundation; billing routes will surface this at call time.
  console.warn('STRIPE_SECRET_KEY is not set -- billing routes are disabled')
}

export const stripe = new Stripe(apiKey ?? 'sk_test_placeholder')

const PLAN_PRICE_IDS: Partial<Record<SubscriptionPlan, string | undefined>> = {
  solo: process.env.STRIPE_PRICE_SOLO,
  team: process.env.STRIPE_PRICE_TEAM
}

export function priceIdForPlan(plan: SubscriptionPlan): string | undefined {
  return PLAN_PRICE_IDS[plan]
}

export function planForPriceId(priceId: string): SubscriptionPlan | undefined {
  const match = Object.entries(PLAN_PRICE_IDS).find(([, id]) => id === priceId)
  return match?.[0] as SubscriptionPlan | undefined
}
