import {
  LEAD_SEQUENCE,
  LEAD_SEQUENCE_BATCH_SIZE,
  UNSUBSCRIBE_API_PATH
} from '@/lib/constants'
import { siteOrigin } from '@/lib/app-url'
import { displayHost } from '@/lib/host'
import { dictionaryFor } from '@/lib/i18n'
import { t } from '@/lib/i18n/format'
import { renderEmail } from '@/lib/email-template'
import { measuredFindings } from '@/lib/readout'
import { readoutValue } from '@/lib/readout-format'
import type { Locale } from '@/lib/enums'
import type { Lead } from '@/db/schema'

/**
 * The follow up to somebody who asked for their report by email and did not buy.
 *
 * **Nothing here is new measurement.** The second mail quotes a finding this code already counted on
 * the reader's own page, recomputed from the JSON already stored on the analysis, and the sentence
 * around it is the same `dictionary.readout.findings[id]` the screen uses. A mail may say what was
 * counted and may never say what changing it will produce -- the same line that governs every other
 * surface. See docs/invariants.md.
 *
 * **A row with no `consented_at` is never touched.** A row captured under a form that promised one
 * mail and nothing else keeps that promise whatever the policy says now, and the null is how it is
 * enforced rather than remembered.
 */

export type SequenceStep = (typeof LEAD_SEQUENCE)[number]

const DAY_MS = 24 * 60 * 60 * 1000

// One address can leave its email on two different reports, so the same person can hold two rows.
// Mailing both in one run is one person receiving two mails minutes apart, which reads as a leak
// rather than as a sequence.
const SAME_ADDRESS_QUIET_MS = DAY_MS

/**
 * Which mail, if any, this row is due.
 *
 * Pure, so the cadence is testable without a database. Returns the furthest step the row has earned:
 * a row that went quiet for a fortnight and is due both mails gets the later one, because sending
 * the day-2 measurement to somebody on day 20 is a mail about a page they have stopped thinking
 * about, and the day-7 offer is the one that still makes sense.
 */
export function dueStep(
  lead: Pick<Lead, 'stage' | 'unsubscribedAt' | 'consentedAt' | 'createdAt'>,
  now: Date
): SequenceStep | null {
  if (!lead.consentedAt || lead.unsubscribedAt) return null

  const ageDays = (now.getTime() - lead.createdAt.getTime()) / DAY_MS

  let due: SequenceStep | null = null
  for (const step of LEAD_SEQUENCE) {
    if (lead.stage >= step.stage) continue
    if (ageDays < step.afterDays) continue
    due = step
  }

  return due
}

/**
 * Rows that may be mailed in this run, one per address.
 *
 * Pure for the same reason `dueStep` is. Ties are broken by the older row: if one person is due two
 * mails for two reports, the report they asked about first is the one they hear about.
 */
export function selectDue<
  T extends Pick<Lead, 'id' | 'email' | 'stage' | 'unsubscribedAt' | 'consentedAt' | 'createdAt'> & {
    lastEmailedAt: Date | null
  }
>(rows: T[], now: Date, limit = LEAD_SEQUENCE_BATCH_SIZE): { lead: T; step: SequenceStep }[] {
  const quietUntil = new Map<string, number>()
  for (const row of rows) {
    if (!row.lastEmailedAt) continue
    const until = row.lastEmailedAt.getTime() + SAME_ADDRESS_QUIET_MS
    quietUntil.set(row.email, Math.max(quietUntil.get(row.email) ?? 0, until))
  }

  const picked = new Map<string, { lead: T; step: SequenceStep }>()

  for (const row of [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if ((quietUntil.get(row.email) ?? 0) > now.getTime()) continue
    if (picked.has(row.email)) continue

    const step = dueStep(row, now)
    if (!step) continue

    picked.set(row.email, { lead: row, step })
    if (picked.size >= limit) break
  }

  return [...picked.values()]
}

export type Candidate = {
  id: string
  email: string
  stage: number
  unsubscribedAt: Date | null
  consentedAt: Date | null
  lastEmailedAt: Date | null
  createdAt: Date
  locale: Locale
  analysisId: string
  url: string
  embedKey: string
}

/**
 * The link in the mail points at the route, which writes and then redirects to the page.
 *
 * The page cannot be the target: a server component that wrote on render would run again on every
 * refresh and on every prefetch, and "did my unsubscribe work" is exactly the moment somebody hits
 * reload.
 */
export function unsubscribeUrl(token: string): string {
  return `${siteOrigin()}${UNSUBSCRIBE_API_PATH}?token=${token}`
}

/**
 * The mail for one due row.
 *
 * Written in `leads.locale`, never in the locale of whatever is running the cron: what is written to
 * this person is written in the language they were reading. Same rule as `analyses.locale`, and the
 * reason the column exists.
 */
export function message(
  lead: Candidate,
  step: SequenceStep,
  unsubscribeToken: string,
  /** The counted line, for the measurement mail. Empty for the offer mail, which quotes no number. */
  finding = ''
) {
  const dictionary = dictionaryFor(lead.locale)
  const copy = dictionary.watch.sequence[step.kind]
  const host = displayHost(lead.url)
  const link = `${siteOrigin()}/r/${lead.embedKey}`
  const out = unsubscribeUrl(unsubscribeToken)

  // The counted line keeps its place in the copy and stops being a paragraph: it is the one sentence
  // in the mail that is a measurement, and the template gives it a rule down the side so a reader
  // skimming the mail sees the number rather than the prose introducing it.
  const body = copy.body.map((line: string) =>
    line.trim() === '{finding}' ? { quote: finding } : t(line, { host })
  )

  return {
    to: lead.email,
    unsubscribeUrl: out,
    subject: t(copy.subject, { host }),
    ...renderEmail({
      heading: copy.heading,
      body,
      action: { label: copy.cta, href: link },
      footer: dictionary.watch.email.footer,
      unsubscribe: { label: dictionary.watch.sequence.unsubscribe, href: out }
    })
  }
}

/**
 * The one finding the measurement mail quotes.
 *
 * The worst thing counted on that page, by the ranking the readout already uses, so the mail leads
 * with the number the reader most wants an answer about. Null when nothing was measured, and the
 * caller then skips the mail rather than sending a sentence with a hole in it.
 */
export function headlineFinding(analysis: {
  structure: Parameters<typeof measuredFindings>[0]['structure']
  seo: Parameters<typeof measuredFindings>[0]['seo']
  performance: Parameters<typeof measuredFindings>[0]['performance']
  crawlerAccess: Parameters<typeof measuredFindings>[0]['crawler']
  keywords: Parameters<typeof measuredFindings>[0]['keywords']
  mobile: Parameters<typeof measuredFindings>[0]['mobile']
  sameness: Parameters<typeof measuredFindings>[0]['sameness']
  market: Parameters<typeof measuredFindings>[0]['market']
}) {
  const findings = measuredFindings({
    structure: analysis.structure,
    seo: analysis.seo,
    performance: analysis.performance,
    crawler: analysis.crawlerAccess,
    keywords: analysis.keywords,
    mobile: analysis.mobile,
    sameness: analysis.sameness,
    market: analysis.market
  })

  return findings.find((finding) => finding.severity === 'alert') ?? findings[0] ?? null
}

/**
 * The one line the measurement mail carries: the label the screen uses, and the value.
 *
 * Both halves come from the same places the report does, so a reader who opens the link cannot find
 * a different number than the mail quoted.
 */
export function findingSentence(
  finding: NonNullable<ReturnType<typeof headlineFinding>>,
  locale: Locale
): string {
  const copy = dictionaryFor(locale).readout

  return `${copy.findings[finding.id]}: ${readoutValue(finding, copy, locale)}`
}

