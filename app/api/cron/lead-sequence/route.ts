import { NextResponse } from 'next/server'
import { and, asc, eq, inArray, isNull, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, hypotheses, leads } from '@/db/schema'
import { LEAD_SEQUENCE } from '@/lib/constants'
import { authorizeCron } from '@/lib/cron-auth'
import {
  findingSentence,
  headlineFinding,
  message,
  selectDue,
  type Candidate
} from '@/lib/lead-sequence'
import { sendEmail } from '@/lib/email'
import { log } from '@/lib/log'

export const runtime = 'nodejs'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Every row the sequence could still act on.
 *
 * **A report whose paid half exists is dropped here**, by the `not exists` on hypotheses: once the
 * fixes have been written for that page the reader has the thing the last mail offers, and offering
 * it anyway is the sequence talking past a customer. Ownership alone is not the test, because an
 * analysis can be claimed by signing in without anything having been bought. See docs/invariants.md.
 *
 * It lives here rather than beside the cadence because it is the only part that needs a database,
 * and keeping `lib/lead-sequence.ts` free of one is what makes the cadence testable.
 */
async function candidates(now: Date): Promise<Candidate[]> {
  const oldest = LEAD_SEQUENCE[0].afterDays

  return db
    .select({
      id: leads.id,
      email: leads.email,
      stage: leads.stage,
      unsubscribedAt: leads.unsubscribedAt,
      consentedAt: leads.consentedAt,
      lastEmailedAt: leads.lastEmailedAt,
      createdAt: leads.createdAt,
      locale: leads.locale,
      analysisId: analyses.id,
      url: analyses.url,
      embedKey: analyses.embedKey
    })
    .from(leads)
    .innerJoin(analyses, eq(analyses.id, leads.analysisId))
    .where(
      and(
        isNull(leads.unsubscribedAt),
        sql`${leads.consentedAt} is not null`,
        sql`${leads.stage} < ${LEAD_SEQUENCE[LEAD_SEQUENCE.length - 1].stage}`,
        lte(leads.createdAt, new Date(now.getTime() - oldest * DAY_MS)),
        sql`not exists (select 1 from ${hypotheses} where ${hypotheses.analysisId} = ${analyses.id})`
      )
    )
    .orderBy(asc(leads.createdAt))
}

/**
 * The follow up to somebody who asked for their report and did not buy.
 *
 * **Idempotent on `leads.stage`, not on the clock.** A run that sends and then crashes has already
 * written the stage, so the next run passes that row over. Calling this twice in a day sends
 * nothing twice, which is what makes it safe to retry by hand.
 *
 * **It moves no balance and grants nothing.** It reads rows, sends mail, and writes back which mail
 * went out. See docs/api.md.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const due = selectDue(await candidates(now), now)

  if (due.length === 0) return NextResponse.json({ sent: 0, skipped: 0 })

  // The measurement mail quotes a finding, so the rows it needs are fetched once for the whole
  // batch rather than per lead.
  const needMeasurement = due.filter((entry) => entry.step.kind === 'measurement')
  // The finding rather than the sentence: the wording is per locale, and one batch can hold rows in
  // both.
  const measurements = new Map<string, NonNullable<ReturnType<typeof headlineFinding>>>()

  if (needMeasurement.length > 0) {
    const rows = await db
      .select({
        id: analyses.id,
        structure: analyses.structure,
        seo: analyses.seo,
        performance: analyses.performance,
        crawlerAccess: analyses.crawlerAccess,
        keywords: analyses.keywords,
        mobile: analyses.mobile,
        sameness: analyses.sameness,
        market: analyses.market
      })
      .from(analyses)
      .where(
        inArray(
          analyses.id,
          needMeasurement.map((entry) => entry.lead.analysisId)
        )
      )

    for (const row of rows) {
      const finding = headlineFinding(row)
      if (!finding) continue
      measurements.set(row.id, finding)
    }
  }

  let sent = 0
  let skipped = 0

  for (const { lead, step } of due) {
    // Nothing was measured on that page, so the mail would carry a sentence with a hole in it.
    // Skipping leaves the stage alone: if a re-measure ever fills the row, the mail can still go.
    const finding = step.kind === 'measurement' ? measurements.get(lead.analysisId) : null

    if (step.kind === 'measurement' && !finding) {
      skipped += 1
      log.info('lead.sequence_skipped', { lead: lead.id, reason: 'nothing_measured' })
      continue
    }

    const row = await db.query.leads.findFirst({
      where: eq(leads.id, lead.id),
      columns: { unsubscribeToken: true }
    })

    if (!row) {
      skipped += 1
      continue
    }

    const line = finding ? findingSentence(finding, lead.locale) : ''
    const delivered = await sendEmail(message(lead, step, row.unsubscribeToken, line))

    if (!delivered) {
      // `sendEmail` never throws and already logged why. Leaving the stage alone means the next run
      // tries again rather than counting a mail nobody received.
      skipped += 1
      log.warn('lead.sequence_failed', { lead: lead.id, stage: step.stage })
      continue
    }

    await db
      .update(leads)
      .set({ stage: step.stage, lastEmailedAt: new Date() })
      .where(eq(leads.id, lead.id))

    sent += 1
    log.info('lead.sequence_sent', { lead: lead.id, stage: step.stage })
  }

  return NextResponse.json({ sent, skipped })
}
