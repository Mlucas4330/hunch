import { NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import {
  CREDITS_ANCHOR,
  DEFAULT_LOCALE,
  PENDING_PAYMENT_MAX_AGE_HOURS,
  PENDING_PAYMENT_REMINDER_AFTER_HOURS
} from '@/lib/constants'
import { authorizeCron } from '@/lib/cron-auth'
import { mercadoPagoEnabled, pendingPayments } from '@/lib/mercadopago'
import { sendEmail } from '@/lib/email'
import { renderEmail } from '@/lib/email-template'
import { siteOrigin } from '@/lib/app-url'
import { dictionaryFor } from '@/lib/i18n'
import { log } from '@/lib/log'

export const runtime = 'nodejs'

const HOUR_MS = 60 * 60 * 1000

/**
 * A reminder about a payment the provider still reports as pending.
 *
 * Pix and boleto are chosen precisely because they settle after the browser has gone, so a checkout
 * nobody finished is an ordinary event rather than a failure. Today nothing follows one.
 *
 * **It grants nothing and could not.** It reads from Mercado Pago, reads a name and address from
 * `users`, and sends mail. `grantCredits` remains the only thing that moves a balance, and this
 * route does not import it. See docs/invariants.md.
 *
 * **Its idempotency is the window, not a column.** A payment is mailed about while it is between
 * PENDING_PAYMENT_REMINDER_AFTER_HOURS and PENDING_PAYMENT_MAX_AGE_HOURS old, and the cron runs
 * daily, so a given payment falls inside that window on one run. Widening the window without adding
 * a record of what was sent would start mailing the same person twice.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!mercadoPagoEnabled()) return NextResponse.json({ sent: 0, reason: 'provider_unset' })

  const now = Date.now()
  const since = new Date(now - PENDING_PAYMENT_MAX_AGE_HOURS * HOUR_MS)

  let payments
  try {
    payments = await pendingPayments(since)
  } catch (error) {
    log.error('billing.reminder_failed', error, { stage: 'search' })
    return NextResponse.json({ error: 'search_failed' }, { status: 502 })
  }

  const ripe = payments.filter((payment) => {
    if (!payment.external_reference || !payment.date_created) return false
    const age = now - new Date(payment.date_created).getTime()
    return age >= PENDING_PAYMENT_REMINDER_AFTER_HOURS * HOUR_MS
  })

  if (ripe.length === 0) return NextResponse.json({ sent: 0 })

  const buyers = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(
      inArray(
        users.id,
        ripe.map((payment) => payment.external_reference as string)
      )
    )

  const byId = new Map(buyers.map((buyer) => [buyer.id, buyer]))
  let sent = 0

  for (const payment of ripe) {
    const buyer = byId.get(payment.external_reference as string)
    if (!buyer) continue

    // The buyer is a signed-in account rather than an anonymous reader, and accounts carry no
    // locale of their own. The default is the honest answer here, unlike `leads.locale`, which
    // records what the reader was actually reading.
    const copy = dictionaryFor(DEFAULT_LOCALE).credits.reminder
    const link = `${siteOrigin()}${CREDITS_ANCHOR}`

    // **No amount in the mail.** Naming a figure would mean formatting a currency here, and the one
    // place that prints a price is the dictionary. Two places holding one number is how the page and
    // the mail start disagreeing about what something costs. See docs/deployment.md.
    const delivered = await sendEmail({
      to: buyer.email,
      subject: copy.subject,
      ...renderEmail({
        heading: copy.heading,
        body: [copy.body],
        action: { label: copy.cta, href: link },
        footer: copy.footer
      })
    })

    if (!delivered) {
      log.warn('billing.reminder_failed', { payment: payment.id })
      continue
    }

    sent += 1
    log.info('billing.reminder_sent', { payment: payment.id, user: buyer.id })
  }

  return NextResponse.json({ sent, pending: payments.length })
}
