import Stripe from 'stripe'
import type { SubscriptionPlan } from '@/lib/enums'

const apiKey = process.env.STRIPE_SECRET_KEY

if (!apiKey) {
  console.warn('STRIPE_SECRET_KEY is not set -- the webhook cannot grant a plan')
}

export const stripe = new Stripe(apiKey || 'sk_test_placeholder', {
  apiVersion: '2025-08-27.basil'
})

const PLAN_PRICE_IDS: Partial<Record<SubscriptionPlan, string | undefined>> = {
  solo: process.env.STRIPE_PRICE_ID
}

export function planForPriceId(priceId: string): SubscriptionPlan | undefined {
  const match = Object.entries(PLAN_PRICE_IDS).find(([, id]) => id === priceId)
  return match?.[0] as SubscriptionPlan | undefined
}
