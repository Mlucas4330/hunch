import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { siteOrigin } from '@/lib/app-url'
import { MERCADOPAGO_PROVIDER, MONITORING_PLAN } from '@/lib/constants'
import { getCurrentUser } from '@/lib/current-user'
import { cancelPreapproval, createPreapproval } from '@/lib/mercadopago'
import { enforceRateLimit } from '@/lib/rate-limit'
import { recordSubscription, subscriptionFor } from '@/lib/subscriptions'
import { log } from '@/lib/log'

/**
 * Opens the monitoring subscription and hands back the URL where it is confirmed.
 *
 * **Session required, and the amount comes from `MONITORING_PLAN`.** The same rule as the pack
 * route: nothing the browser sends decides what is charged, and the renewal is matched back against
 * the same number by the webhook. See lib/mercadopago.ts.
 *
 * **It entitles nothing.** The row is written `pending`, which no sweep reads; only the webhook
 * confirming the provider authorised it flips that to `authorized`. A caller who opens a checkout
 * and walks away has bought nothing and is swept for nothing.
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('billing', user.id)
  if (limited) return limited

  try {
    const preapproval = await createPreapproval(
      {
        reason: MONITORING_PLAN.id,
        external_reference: user.id,
        payer_email: user.email,
        back_url: `${siteOrigin()}/dashboard`,
        status: 'pending',
        auto_recurring: {
          frequency: MONITORING_PLAN.frequency,
          frequency_type: MONITORING_PLAN.frequencyType,
          transaction_amount: MONITORING_PLAN.amountBrl,
          currency_id: MONITORING_PLAN.currency
        }
      },
      randomUUID()
    )

    // Written before the reader is sent anywhere, so the webhook has a row to find whichever way the
    // race falls -- `recordSubscription` upserts for exactly that reason.
    await recordSubscription({
      userId: user.id,
      provider: MERCADOPAGO_PROVIDER,
      providerRef: preapproval.id,
      status: 'pending'
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
 * `userId`, so there is no field anywhere a caller could put somebody else's `preapproval_id` in.
 * This is the whole authorisation story and it is deliberately structural rather than a check: a
 * body-supplied id plus an ownership test is one forgotten line away from cancelling strangers'
 * subscriptions.
 *
 * **The provider is called first and the row written second.** Only one order is safe. Writing
 * `cancelled` and then failing to reach Mercado Pago would stop sweeping somebody who is still being
 * charged -- they lose what they pay for, silently. The other way round, the provider has cancelled
 * and our row is stale for as long as it takes the `preapproval` webhook to arrive, which is the
 * failure that repairs itself.
 *
 * The write here is optimistic so the screen answers immediately; `syncPreapproval` in the webhook
 * stays the writer of record, so there is no second source of truth about what state this is in.
 */
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('billing', user.id)
  if (limited) return limited

  const subscription = await subscriptionFor(user.id)

  // Nothing to cancel and somebody else's subscription are the same answer on purpose: neither
  // tells the caller anything about a row they do not own.
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
    // Kept, not cleared: it is what lets the sweep honour the month already paid for. See
    // analysesDueForRemeasure.
    currentPeriodEnd: subscription.currentPeriodEnd
  })

  log.info('subscription.status_changed', { user: user.id, status: 'cancelled', stored: true })

  return NextResponse.json({ cancelled: true })
}
