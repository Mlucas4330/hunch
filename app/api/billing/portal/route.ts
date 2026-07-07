import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/current-user'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: 'no_customer' }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/billing`
  })

  return NextResponse.json({ url: session.url })
}
