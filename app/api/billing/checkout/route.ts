import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/current-user'
import { siteOrigin } from '@/lib/app-url'
import { CREDIT_PACKS } from '@/lib/constants'
import { stripe } from '@/lib/stripe'

const BodySchema = z.object({
  pack: z.enum(CREDIT_PACKS.map((p) => p.id) as [string, ...string[]])
})

/**
 * Starts a one-off Checkout Session for a credit pack.
 *
 * **Session required, and the email is taken from it rather than from the body.** The webhook grants
 * on whatever email the payment carries, so letting a caller name one here would let anyone buy
 * credits into someone else's account.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_pack' }, { status: 422 })

  const pack = CREDIT_PACKS.find((p) => p.id === parsed.data.pack)
  if (!pack?.priceId) return NextResponse.json({ error: 'pack_unavailable' }, { status: 503 })

  try {
    const origin = siteOrigin()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: pack.priceId, quantity: 1 }],
      // Pinned to the signed-in account so the webhook credits the buyer even when Stripe has a
      // different email on file for the card.
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${origin}/dashboard`,
      cancel_url: `${origin}/dashboard`
    })

    return session.url
      ? NextResponse.json({ url: session.url })
      : NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
  } catch (error) {
    console.error('[billing/checkout] failed', error)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
  }
}
