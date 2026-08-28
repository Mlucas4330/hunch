import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, pageSnapshots, users } from '@/db/schema'
import { measurePage } from '@/lib/analyze'
import {
  deltas,
  isWorthReporting,
  regressions,
  snapshotInput,
  snapshotValues,
  type Regression
} from '@/lib/snapshots'
import { dictionaryFor } from '@/lib/i18n'
import { t } from '@/lib/i18n/format'
import { sendEmail } from '@/lib/email'
import { siteOrigin } from '@/lib/app-url'
import { displayHost } from '@/lib/host'
import { log } from '@/lib/log'
import { jobRef, type RunOutcome } from '@/lib/queue'
import type { Locale, ReadoutFinding } from '@/lib/enums'

/**
 * Measures a subscriber's page again and tells them what moved.
 *
 * **It is its own job kind, and that is not tidiness.** `runAnalysis` returns early on a row that
 * already holds a measurement -- it has to, or a requeued job would write every hypothesis twice --
 * so enqueuing `analysis:<id>` for a page that has already been measured is a guaranteed no-op. This
 * kind exists to say "measure it again" to a row whose whole point is that it was measured before.
 *
 * **It spends no credit and calls no model.** A re-measure is `measurePage` and arithmetic, which is
 * what makes it something a monthly fee can cover: the subscription pays for a browser slot a week,
 * not for tokens. See docs/invariants.md.
 */
export const REMEASURE_JOB_KIND = 'remeasure'

export async function runRemeasure(id: string): Promise<RunOutcome> {
  const analysisId = jobRef(id)

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.id, analysisId),
    columns: { id: true, url: true, market: true, locale: true, embedKey: true, userId: true }
  })

  // An analysis deleted between the sweep and the drain is not a failure the queue should retry.
  if (!analysis?.userId) return { ok: false }

  const measurement = await measurePage(analysis.url)

  // Read before the write: this is the measurement the new one is compared against, and once the
  // insert below lands the newest row is the new one.
  const [previous] = await db
    .select()
    .from(pageSnapshots)
    .where(eq(pageSnapshots.analysisId, analysis.id))
    .orderBy(desc(pageSnapshots.capturedAt))
    .limit(1)

  // The columns are the current measurement and the snapshot is the history, written together so a
  // trend can never disagree with what the readout above it shows.
  await db.transaction(async (tx) => {
    await tx
      .update(analyses)
      .set({
        structure: measurement.structure,
        seo: measurement.seo,
        performance: measurement.performance,
        crawlerAccess: measurement.crawlerAccess,
        keywords: measurement.keywords,
        mobile: measurement.mobile
      })
      .where(eq(analyses.id, analysis.id))

    await tx.insert(pageSnapshots).values(snapshotValues(analysis.id, measurement, analysis.market))
  })

  const now = snapshotInput(measurement, analysis.market)
  const before = previous ? snapshotInput(previous, analysis.market) : null

  const moved = deltas(now, before)
  const regression = regressions(now, before)

  log.info('remeasure.measured', {
    analysis: analysis.id,
    moved: moved.size,
    worsened: regression.worsened.length,
    scoreDrop: regression.scoreDrop
  })

  // **Only a regression is worth a message.** The sweep runs every week whatever happens, and the
  // measurement is written either way -- what the reader sees on the report is the full picture,
  // improvements included. But a push interrupts somebody, and interrupting weekly to say two
  // numbers drifted is how a subscriber learns to filter the only message this product sends.
  //
  // It also answers the fair objection that the owner already knows what they changed. They do. What
  // they do not know is that a tag somebody else added, a CMS image swap or a slower CDN pushed the
  // page the wrong way -- and that is exactly the case this fires on.
  if (!isWorthReporting(regression)) return { ok: true }

  const owner = await db.query.users.findFirst({
    where: eq(users.id, analysis.userId),
    columns: { email: true }
  })

  if (owner) {
    await sendEmail(
      weeklyMessage({
        to: owner.email,
        locale: analysis.locale,
        url: analysis.url,
        embedKey: analysis.embedKey,
        moved,
        regression
      })
    )
  }

  return { ok: true }
}

/**
 * What the weekly email says.
 *
 * **Every sentence is subtraction between two measurements, and none of them names a cause.** "Your
 * LCP is 2.1s lower than last week" is arithmetic over two numbers this code measured, so it is
 * allowed. "Your fix cut LCP by 2.1s" is not: nobody controlled for anything between the two
 * measurements, the page may have changed ten times or not at all while a CDN did, and this product
 * runs no experiment that could tell the difference. See docs/invariants.md.
 *
 * The copy comes from the dictionary in the analysis's pinned locale, with the count interpolated,
 * for the same reason every other generated surface does.
 */
function weeklyMessage(input: {
  to: string
  locale: Locale
  url: string
  embedKey: string
  moved: Map<ReadoutFinding, number>
  regression: Regression
}) {
  const dictionary = dictionaryFor(input.locale)
  const copy = dictionary.watch.weekly
  const link = `${siteOrigin()}/r/${input.embedKey}`
  const host = displayHost(input.url)

  const label = (finding: ReadoutFinding) => dictionary.readout.findings[finding] ?? finding

  // **What got worse leads, and it is the only thing the message is about.** Whatever else moved is
  // on the report; this is the interruption, so it carries the reason for interrupting and stops.
  const lines = input.regression.worsened.map((finding) => {
    const delta = input.moved.get(finding.id)

    return delta === undefined
      ? label(finding.id)
      : t(delta > 0 ? copy.rose : copy.fell, {
          label: label(finding.id),
          amount: String(Math.abs(delta))
        })
  })

  // Two openings, because the two signals are different facts. A score that fell without any single
  // finding crossing is a page that picked up a dozen small warns, and saying "3 checks got worse"
  // there would be false.
  const body =
    input.regression.worsened.length > 0
      ? t(copy.body, { host, count: String(input.regression.worsened.length) })
      : t(copy.bodyScore, { host, points: String(input.regression.scoreDrop) })

  // **The way out has to be visible.** Somebody who wants these to stop and cannot find how will
  // block the sender or, worse, mark it spam -- and that costs the sending domain's reputation,
  // which is what the lead confirmation mail depends on. The link goes to the dashboard, where
  // cancelling also stops the charge: an unsubscribe that silenced the mail while the subscription
  // kept billing would be the worst of the three outcomes for everyone.
  const dashboard = `${siteOrigin()}/dashboard`

  return {
    to: input.to,
    subject: t(copy.subject, { host }),
    text: [
      copy.heading,
      '',
      body,
      '',
      ...lines.map((line) => `- ${line}`),
      '',
      link,
      '',
      copy.disclaimer,
      t(copy.manage, { link: dashboard })
    ].join('\n'),
    html: [
      `<h1>${copy.heading}</h1>`,
      `<p>${escapeHtml(body)}</p>`,
      `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`,
      `<p><a href="${link}">${copy.cta}</a></p>`,
      `<hr>`,
      `<p>${copy.disclaimer}</p>`,
      `<p>${t(copy.manage, { link: `<a href="${dashboard}">${dashboard}</a>` })}</p>`
    ].join('\n')
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
