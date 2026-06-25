import Stripe from 'stripe'

const apiKey = process.env.STRIPE_SECRET_KEY

if (!apiKey) {
  // Allowed at build time / in foundation; billing routes will surface this at call time.
  console.warn('STRIPE_SECRET_KEY is not set -- billing routes are disabled')
}

export const stripe = new Stripe(apiKey ?? 'sk_test_placeholder')
