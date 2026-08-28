import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, leads } from '@/db/schema'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { dictionaryFor } from '@/lib/i18n'
import { t } from '@/lib/i18n/format'
import { sendEmail } from '@/lib/email'
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
 * **It gates nothing.** The readout is never behind this, on this surface or any other -- see
 * invariants.md. The old email wall traded a stranger's address for a preview of someone else's
 * report and was removed for it; this asks for an address in exchange for something the reader
 * actually gets, which is the report's own URL in their inbox.
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
    await db
      .insert(leads)
      .values({ email, analysisId: analysis.id, locale: analysis.locale })
      .onConflictDoNothing()

    // Deliberately not awaited into the response's critical path in spirit, but awaited in fact:
    // the runtime can freeze the process the moment the response is returned, so a floating promise
    // here is a mail that sometimes never sends. `sendEmail` never throws and never rejects.
    await sendEmail(message(analysis.locale, analysis.url, embedKey, email))

    return NextResponse.json({ ok: true }, { status: 202 })
  } catch (error) {
    log.error('lead.failed', error)
    return NextResponse.json({ error: 'lead_failed' }, { status: 500 })
  }
}

// The only interpolated value is a hostname off a URL a stranger submitted, and `displayHost` hands
// back the raw string when the URL will not parse. Escaping it costs nothing and means the email
// body can never be composed by whoever chose the URL.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function message(locale: Locale, url: string, embedKey: string, to: string) {
  const copy = dictionaryFor(locale).watch.email
  const link = `${siteOrigin()}/r/${embedKey}`
  const host = displayHost(url)

  return {
    to,
    subject: copy.subject,
    text: [copy.heading, '', t(copy.body, { host }), '', link, '', copy.keep, '', copy.footer].join(
      '\n'
    ),
    html: [
      `<h1>${copy.heading}</h1>`,
      `<p>${t(copy.body, { host: escapeHtml(host) })}</p>`,
      `<p><a href="${link}">${copy.cta}</a></p>`,
      `<p>${copy.keep}</p>`,
      `<hr>`,
      `<p>${copy.footer}</p>`
    ].join('\n')
  }
}
