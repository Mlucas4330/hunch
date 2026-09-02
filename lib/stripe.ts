import Stripe from 'stripe'
import { CREDIT_PACKS } from '@/lib/constants'

const apiKey = process.env.STRIPE_SECRET_KEY

if (!apiKey) {
  console.warn('STRIPE_SECRET_KEY is not set, so checkout and the webhook cannot work')
}

export const stripe = new Stripe(apiKey || 'sk_test_placeholder', {
  apiVersion: '2025-08-27.basil'
})

/**
 * How many credits a Stripe price is worth.
 *
 * **Read from our own map, never from anything the caller or the dashboard can set.** Stripe metadata
 * is editable from the dashboard, so honouring a `credits` field there would let whoever has
 * dashboard access mint credits without a payment. The price id is what the customer actually paid
 * against, and it is the only input trusted here.
 */
export function creditsForPrice(priceId: string): number {
  return CREDIT_PACKS.find((pack) => pack.priceId === priceId)?.credits ?? 0
}
