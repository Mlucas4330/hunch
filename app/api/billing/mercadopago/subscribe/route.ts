import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { billingReturnUrl } from '@/lib/app-url'
import {
  BILLING_RETURN_PATH,
  MERCADOPAGO_PROVIDER,
  PLAN,
  PLAN_FREQUENCY
} from '@/lib/constants'
import { PLAN_TIER } from '@/lib/enums'
import { getCurrentUser } from '@/lib/current-user'
import { log } from '@/lib/log'
import { cancelPreapproval, createPreapproval, mercadoPagoEnabled } from '@/lib/mercadopago'
import { enforceRateLimit } from '@/lib/rate-limit'
import { recordSubscription, subscriptionFor } from '@/lib/subscriptions'

export const runtime = 'nodejs'

const BodySchema = z.object({ tier: z.enum(PLAN_TIER) })

/**
 * Opens the subscription and hands back the URL where the reader confirms it.
 *
 * **Session required, and the amount comes from `PLAN`.** The tier arrives in the body and is
 * validated against the enum; the price is never read from the request, and the webhook matches the
 * confirmed amount back against the same map. See docs/security.md.
 *
 * **It entitles nothing.** The row is written `pending`, which `entitledTierFor` does not read, so
 * somebody who opens a checkout and walks away has bought nothing.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('billing', user.id)
  if (limited) return limited

  if (!mercadoPagoEnabled()) {
    return NextResponse.json({ error: 'billing_unavailable' }, { status: 503 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_tier' }, { status: 422 })

  const { tier } = parsed.data

  try {
    const preapproval = await createPreapproval(
      {
        reason: tier,
        external_reference: user.id,
        payer_email: user.email,
        back_url: billingReturnUrl(BILLING_RETURN_PATH),
        status: 'pending',
        auto_recurring: {
          frequency: PLAN_FREQUENCY.frequency,
          frequency_type: PLAN_FREQUENCY.frequencyType,
          transaction_amount: PLAN[tier].priceBrl,
          currency_id: PLAN_FREQUENCY.currency
        }
      },
      randomUUID()
    )

    // Written before the reader is sent anywhere, so the webhook has a row to find whichever way the
    // race falls. `recordSubscription` upserts for exactly that reason.
    await recordSubscription({
      userId: user.id,
      provider: MERCADOPAGO_PROVIDER,
      providerRef: preapproval.id,
      status: 'pending',
      tier
    })

    return NextResponse.json({ id: preapproval.id, initPoint: preapproval.init_point ?? null })
  } catch (error) {
    log.error('subscription.created_failed', error, { user: user.id })
    return NextResponse.json({ error: 'subscription_failed' }, { status: 502 })
  }
}

/**
 * Ends the caller's own subscription.
 *
 * **The id comes from the session, never from the request.** `subscriptionFor` looks the row up by
 * `userId`, so there is no field anywhere a caller could put somebody else's preapproval id in. That
 * is the whole authorization story and it is structural on purpose: a body-supplied id plus an
 * ownership check is one forgotten line away from cancelling strangers' subscriptions.
 *
 * **The provider is called first and the row written second.** Writing `cancelled` and then failing
 * to reach Mercado Pago would stop the quota of somebody who is still being charged. The other way
 * round, our row is stale until the webhook arrives, which is the failure that repairs itself.
 *
 * The quota is not touched here. `current_period_end` is kept, so the month already paid for is
 * honoured, and `quotaFor` stops reading the entitlement the moment it passes.
 */
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('billing', user.id)
  if (limited) return limited

  const subscription = await subscriptionFor(user.id)

  // Nothing to cancel and somebody else's subscription are the same answer on purpose.
  if (!subscription || subscription.status === 'cancelled') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  try {
    await cancelPreapproval(subscription.providerRef)
  } catch (error) {
    log.error('subscription.cancel_failed', error, { user: user.id })
    return NextResponse.json({ error: 'cancel_failed' }, { status: 502 })
  }

  await recordSubscription({
    userId: user.id,
    provider: MERCADOPAGO_PROVIDER,
    providerRef: subscription.providerRef,
    status: 'cancelled',
    tier: subscription.tier,
    currentPeriodEnd: subscription.currentPeriodEnd
  })

  log.info('subscription.status_changed', { user: user.id, status: 'cancelled' })

  return NextResponse.json({ cancelled: true })
}
