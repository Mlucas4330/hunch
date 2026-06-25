import { NextResponse } from 'next/server'

// Excluded from auth middleware -- Stripe calls this directly.
// Feature work: verify the signature with stripe.webhooks.constructEvent, then handle
// checkout.session.completed / customer.subscription.updated / customer.subscription.deleted
// idempotently.
export async function POST() {
  return NextResponse.json({ error: 'not_implemented' }, { status: 501 })
}
