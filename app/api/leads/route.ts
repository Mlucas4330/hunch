import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, leads } from '@/db/schema'
import { GCLID_COOKIE } from '@/lib/constants'
import {
  leadConversionAction,
  leadConversionEnabled,
  uploadClickConversion
} from '@/lib/google-ads'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { dictionaryFor } from '@/lib/i18n'
import { t } from '@/lib/i18n/format'
import { sendEmail } from '@/lib/email'
import { renderEmail } from '@/lib/email-template'
import { unsubscribeUrl } from '@/lib/lead-sequence'
import { siteOrigin } from '@/lib/app-url'
import { displayHost } from '@/lib/host'
import { log } from '@/lib/log'
import type { Locale } from '@/lib/enums'

const BodySchema = z.object({
  email: z.string().email().max(254),
  embedKey: z.string().uuid()
})

/**
 * Takes an address from someone reading a report and sends them the link to it.
 *
 * **It gates nothing.** The readout is never behind this, on this surface or any other. See
 * invariants.md. A wall trading a stranger's address for a preview of someone else's report is the
 * thing that rule forbids; this asks for an address in exchange for something the reader actually
 * gets, which is the report's own URL in their inbox.
 *
 * That offer is honest rather than a pretext: `embed_key` is an unguessable uuid held only in the
 * browser's localStorage (`ANONYMOUS_ANALYSES_KEY`), so a cleared history really does lose the
 * report for good. The email is the only durable copy of the link an anonymous reader can have.
 *
 * **A lead is not a user and this route never touches `users`.** It cannot grant, spend or claim
 * anything; the address is a string a stranger typed and it stays in its own table where it can
 * never key a sign-in. See db/schema.ts.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit('lead', clientIp(request))
  if (limited) return limited

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 422 })

  const { email, embedKey } = parsed.data

  try {
    const [analysis] = await db
      .select({ id: analyses.id, url: analyses.url, locale: analyses.locale })
      .from(analyses)
      .where(eq(analyses.embedKey, embedKey))
      .limit(1)

    if (!analysis) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    // Pinned to the analysis's locale, not the request's: what gets written to this person is
    // written in the language they were reading when they asked. Same rule as `analyses.locale`.
    // **`consentedAt` is what the sequence and the ad audience read**, and it is written here because
    // this is the request the reader made after reading `watch.note`. That note now states what
    // actually happens: the link, two more mails, and that the address may be used for our ads.
    //
    // Rows written before that note existed carry a null, and every follower of this column leaves
    // them alone. They were promised one mail and nothing else, and a policy that changed afterwards
    // does not reach backwards. See docs/ads.md.
    //
    // The token comes back so the mail can carry the way out, in the body and in the
    // `List-Unsubscribe` header. A second submit of the same address for the same page conflicts and
    // returns nothing, so the existing row's token is read instead: the person is the same person
    // and their link must not change.
    const [inserted] = await db
      .insert(leads)
      .values({
        email,
        analysisId: analysis.id,
        locale: analysis.locale,
        consentedAt: new Date()
      })
      .onConflictDoNothing()
      .returning({ id: leads.id, unsubscribeToken: leads.unsubscribeToken })

    const token =
      inserted ??
      (await db.query.leads.findFirst({
        where: and(eq(leads.email, email), eq(leads.analysisId, analysis.id)),
        columns: { unsubscribeToken: true }
      }))

    // **Only when the insert actually wrote a row.** `onConflictDoNothing` returns nothing on a
    // resubmit of the same address for the same page, and that is the whole of the idempotency here:
    // a reader who submits twice is one lead and must be reported once. It is the same guarantee the
    // purchase upload gets from the ledger's `(provider, provider_ref)` unique.
    if (inserted) await reportLead(inserted.id)

    // Deliberately not awaited into the response's critical path in spirit, but awaited in fact:
    // the runtime can freeze the process the moment the response is returned, so a floating promise
    // here is a mail that sometimes never sends. `sendEmail` never throws and never rejects.
    await sendEmail(
      message(analysis.locale, analysis.url, embedKey, email, token?.unsubscribeToken)
    )

    return NextResponse.json({ ok: true }, { status: 202 })
  } catch (error) {
    log.error('lead.failed', error)
    return NextResponse.json({ error: 'lead_failed' }, { status: 500 })
  }
}

/**
 * Reports the captured address to Google Ads as a lead, against a second conversion action.
 *
 * **What leaves is the click id and nothing about the person.** Not the address, not the page they
 * measured, not a score. Google already issued the click id; this says that click reached the point
 * where somebody asked for their report back.
 *
 * **It carries no value**, and that is deliberate rather than unfinished. Nobody paid anything here,
 * so a figure would be the expected value of a lead -- a number this code would have invented, which
 * is precisely what docs/invariants.md refuses everywhere else. Our own reporting gets no exemption.
 *
 * **The action it reports against is meant to be a secondary one in the account**, outside the
 * bidding goal. That is what keeps the choice honest: it buys a reading of which ad group produces
 * addresses, without letting Smart Bidding go hunting for people who never pay. See docs/ads.md.
 *
 * Nothing here can fail the request. A lead lost because Google was unreachable would be the
 * marketing bookkeeping costing the thing it exists to measure, the same reasoning that wraps
 * `rememberAdClick` in front of a payment.
 */
async function reportLead(leadId: string): Promise<void> {
  try {
    if (!leadConversionEnabled()) return

    const gclid = (await cookies()).get(GCLID_COOKIE)?.value
    // The ordinary path, and not a failure: most readers never came from an ad. At info for the
    // same reason `ads.conversion_skipped` is.
    if (!gclid) return log.info('ads.lead_skipped', { reason: 'no_click', lead: leadId })

    await uploadClickConversion({
      gclid,
      // The row's own id. Unique per lead, so a second upload of the same one updates Google's
      // conversion rather than adding a second.
      orderId: leadId,
      at: new Date(),
      conversionActionId: leadConversionAction()
    })

    log.info('ads.lead_uploaded', { lead: leadId })
  } catch (error) {
    log.error('ads.lead_failed', error, { lead: leadId })
  }
}

function message(
  locale: Locale,
  url: string,
  embedKey: string,
  to: string,
  unsubscribeToken?: string
) {
  const dictionary = dictionaryFor(locale)
  const copy = dictionary.watch.email
  const link = `${siteOrigin()}/r/${embedKey}`
  const host = displayHost(url)
  // This mail is also what enrols the reader in the sequence, so it carries the same way out the
  // sequence's own mails do. Absent only if the row could not be read back, and a missing link is
  // better than a broken one.
  const out = unsubscribeToken ? unsubscribeUrl(unsubscribeToken) : null
  const leave = dictionary.watch.sequence.unsubscribe

  return {
    to,
    ...(out ? { unsubscribeUrl: out } : {}),
    subject: copy.subject,
    ...renderEmail({
      heading: copy.heading,
      body: [t(copy.body, { host })],
      action: { label: copy.cta, href: link },
      note: copy.keep,
      footer: copy.footer,
      ...(out ? { unsubscribe: { label: leave, href: out } } : {})
    })
  }
}
