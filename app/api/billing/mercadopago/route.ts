import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { siteOrigin } from '@/lib/app-url'
import { CREDIT_PACKS } from '@/lib/constants'
import { getCurrentUser } from '@/lib/current-user'
import { createPayment } from '@/lib/mercadopago'
import { enforceRateLimit } from '@/lib/rate-limit'

// Whatever the Payment Brick collected. Passed through rather than modelled field by field -- the
// set differs per payment method, and the three fields this route actually decides are overwritten
// below regardless of what arrived in them.
const BodySchema = z.object({
  pack: z.enum(CREDIT_PACKS.map((p) => p.id) as [string, ...string[]]),
  payment: z.record(z.unknown())
})

/**
 * Creates the payment the Brick collected, for one credit pack.
 *
 * **Session required, and three fields are taken from the server rather than from the body.** The
 * amount comes from `CREDIT_PACKS`, because the browser submits the form and a caller who edits
 * `transaction_amount` would otherwise buy ten analyses for a real. `external_reference` is the
 * signed-in user's id, which is how the webhook knows whom to credit -- Mercado Pago's `payer.email`
 * is the buyer's account address and is frequently not the one they signed in with.
 *
 * **It grants nothing.** Even a card approved in this response is credited by the webhook, so there
 * is one path that moves a balance rather than two that must agree.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('billing', user.id)
  if (limited) return limited

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_pack' }, { status: 422 })

  const pack = CREDIT_PACKS.find((p) => p.id === parsed.data.pack)
  if (!pack) return NextResponse.json({ error: 'invalid_pack' }, { status: 422 })

  try {
    const payment = await createPayment(
      {
        ...parsed.data.payment,
        transaction_amount: pack.amountBrl,
        external_reference: user.id,
        notification_url: `${siteOrigin()}/api/billing/mercadopago/webhook`
      },
      randomUUID()
    )

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      qrCode: payment.point_of_interaction?.transaction_data?.qr_code ?? null,
      qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null
    })
  } catch (error) {
    console.error('[billing/mercadopago] payment failed', error)
    return NextResponse.json({ error: 'payment_failed' }, { status: 502 })
  }
}
