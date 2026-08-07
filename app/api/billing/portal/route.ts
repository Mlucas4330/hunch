import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/current-user'
import { stripe } from '@/lib/stripe'
import { appOrigin } from '@/lib/app-url'
import { POST_SIGNIN_REDIRECT } from '@/lib/constants'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: 'no_customer' }, { status: 400 })
  }

  const origin = appOrigin(request)
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    // Dormant route: nothing in the UI calls it since the self-serve shop window was removed. It
    // returns to the dashboard rather than to /billing, which no longer exists -- a dormant route
    // that sends a paying customer to a 404 is a trap for whoever re-enables it.
    return_url: `${origin}${POST_SIGNIN_REDIRECT}`
  })

  return NextResponse.json({ url: session.url })
}
