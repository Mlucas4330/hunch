import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, flowFixes, hypotheses, pageSnapshots, variants } from '@/db/schema'
import { generateFromMeasurement, measurePage } from '@/lib/analyze'
import { refundCredit } from '@/lib/credits'
import { jobId, jobRef, readJob, type RunOutcome } from '@/lib/queue'
import { JOB_IN_FLIGHT } from '@/lib/enums'
import { snapshotValues } from '@/lib/snapshots'

export const ANALYSIS_JOB_KIND = 'analysis'

/**
 * Whether a generation is in flight for this analysis right now.
 *
 * **The row cannot answer this and must not be asked to.** An owned analysis with no hypotheses is
 * two different situations that look identical in Postgres: one whose Sonnet calls are running, and
 * one whose owner claimed a free run and never bought a generation. The report surface has to tell
 * them apart -- one gets a placeholder that will fill in, the other gets the unlock wall -- and the
 * job is exactly the thing that knows. The durable RESULT still comes from the row, which is the
 * rule `analysisProgress` below follows and this does not contradict.
 *
 * Redis down means no job, so this answers false and the surface falls back to the wall. That is the
 * right way round: a wall on a report that is quietly still working is recoverable by reloading, and
 * a placeholder that will never fill is not.
 */
export async function isGenerating(analysisId: string): Promise<boolean> {
  const job = await readJob(jobId(ANALYSIS_JOB_KIND, analysisId))
  return job !== null && JOB_IN_FLIGHT.includes(job.status)
}

/**
 * The job behind every analysis, and the one place the free/paid cut is made.
 *
 * **An analysis with no owner is measured and nothing more.** `measurePage` is a scrape plus the
 * robots.txt fetch; `measuredFindings`, `readoutScore` and `extractKeywords` are pure arithmetic over
 * what it counted. No model is called, so an anonymous run costs a browser slot and **zero tokens** —
 * which is what makes it safe to give away to ad traffic where most visitors never convert.
 *
 * An owned analysis gets the generation too. The cut is `userId`, not a flag, because ownership is
 * exactly the thing that says someone paid for this. See docs/product.md.
 */
export async function runAnalysis(id: string): Promise<RunOutcome> {
  const analysisId = jobRef(id)

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.id, analysisId),
    columns: {
      id: true,
      url: true,
      userId: true,
      brief: true,
      locale: true,
      market: true,
      structure: true,
      competitorUrl: true
    },
    with: { hypotheses: { columns: { id: true }, limit: 1 } }
  })

  if (!analysis) return { ok: false }

  // A job the queue put back after a restart runs its handler a second time, so the handler has to
  // be able to say "already done". Without this a requeued analysis inserts a second set of
  // hypotheses, variants and fixes alongside the first, and the reader gets every idea twice.
  //
  // The two halves are checked separately because they are two different finish lines: an ownerless
  // run is complete once the page was measured, an owned one only once the generation landed. An
  // owned row that was measured but never generated is a crash between the two, and redoing it is
  // exactly right. The credit is not at stake either way -- it is spent by the route, not here.
  if (analysis.structure !== null && (!analysis.userId || analysis.hypotheses.length > 0)) {
    return { ok: true }
  }

  // **Measured and stored first, whoever owns it.** This used to be the ownerless branch alone: an
  // owned run went through one call that scraped and generated and wrote everything in a single
  // transaction at the end, so `analyses.structure` stayed null for the whole three minutes. The
  // consequence was that `analysisProgress` reported `measured` and `generated` turning true at the
  // same instant, and the person who had paid waited longer for the score than the anonymous visitor
  // who got it free. The score exists about twenty seconds in; there was never a reason to sit on it.
  const measurement = await measurePage(analysis.url)

  // **Skipped when the row already carries one, and that is about `page_snapshots`, not tidiness.**
  // The guard above lets an owned analysis back in here when it was measured and then died before
  // generating, so this runs a second time for the same analysis -- and a second snapshot row is a
  // second entry in the history the trend subtracts across. It would report that every number moved
  // by zero at a moment nothing happened. The columns keep the first measurement for the same
  // reason: the stored readout and the newest snapshot have to be the same measurement.
  if (analysis.structure === null) {
    await db.transaction(async (tx) => {
      await tx
        .update(analyses)
        .set({
          structure: measurement.structure,
          seo: measurement.seo,
          performance: measurement.performance,
          crawlerAccess: measurement.crawlerAccess,
          keywords: measurement.keywords,
          mobile: measurement.mobile,
          // Re-detected from the page's own `lang`, a stronger signal than the URL the route had at
          // creation. See docs/invariants.md.
          market: measurement.market
        })
        .where(eq(analyses.id, analysis.id))

      await tx
        .insert(pageSnapshots)
        .values(snapshotValues(analysis.id, measurement, measurement.market))
    })
  }

  if (!analysis.userId) return { ok: true }

  // The credit was spent before the job was queued, so a generation that throws has to give it back.
  // `AnalysisOutputSchema` has a `.min(5)` that deliberately does not degrade, which makes "paid for a
  // Sonnet call and got nothing" a real path rather than a theoretical one. See docs/api.md.
  //
  // It is a much better failure than it was: the readout above is already committed, so the reader
  // keeps the score and the credit comes back, instead of watching a spinner for three minutes and
  // being handed an error screen.
  let output
  try {
    output = await generateFromMeasurement(analysis.url, measurement, {
      brief: analysis.brief ?? undefined,
      locale: analysis.locale,
      // Only the owned branch measures it. The early return above is what makes an anonymous run
      // cost one browser slot and zero tokens, and a second page would double the slot half of that
      // for traffic where most visitors never convert. See docs/invariants.md.
      competitorUrl: analysis.competitorUrl
    })
  } catch (error) {
    await refundCredit(analysis.userId, analysis.id)
    throw error
  }

  const ranked = [...output.hypotheses].sort((a, b) => b.impact_score - a.impact_score)

  await db.transaction(async (tx) => {
    // **Only what the generation produced.** The measured columns and the snapshot were written by
    // the transaction above, off the same `measurement` object this generation was handed -- writing
    // them again here would be a second identical `page_snapshots` row per analysis, which is a lie
    // to every delta the trend draws from that table. `competitor` is the exception and belongs
    // here: it is scraped inside the generation, because only a prompt ever reads it.
    await tx
      .update(analyses)
      .set({ competitor: output.competitor })
      .where(eq(analyses.id, analysis.id))

    const rows = await tx
      .insert(hypotheses)
      .values(
        ranked.map((h) => ({
          analysisId: analysis.id,
          section: h.section,
          problem: h.problem,
          currentCopy: h.current_copy,
          impactScore: h.impact_score,
          rationale: h.rationale,
          selector: h.selector,
          target: h.target
        }))
      )
      .returning()

    await tx.insert(variants).values(
      rows.flatMap((row, i) =>
        ranked[i].variants.map((variant, position) => ({
          hypothesisId: row.id,
          copy: variant.copy,
          evidence: variant.evidence,
          emphasis: variant.emphasis,
          position
        }))
      )
    )

    const rankedFixes = [
      ...[...output.playbook]
        .sort((a, b) => b.impact_score - a.impact_score)
        .map((fix, position) => ({ fix, kind: 'flow' as const, position })),
      ...[...output.visibility]
        .sort((a, b) => b.impact_score - a.impact_score)
        .map((fix, position) => ({ fix, kind: 'visibility' as const, position }))
    ]

    if (rankedFixes.length) {
      await tx.insert(flowFixes).values(
        rankedFixes.map(({ fix, kind, position }) => ({
          analysisId: analysis.id,
          kind,
          category: fix.category,
          title: fix.title,
          problem: fix.problem,
          steps: fix.steps,
          impactScore: fix.impact_score,
          evidence: fix.evidence,
          finding: fix.finding,
          position
        }))
      )
    }
  })

  return { ok: true }
}

/**
 * What the client polls for. Read off the row rather than the job, because the row is the durable
 * answer and the job only exists while the work is in flight — the same rule the screenshot status
 * follows. `measured` is what unlocks the readout; `generated` is what unlocks the fixes.
 */
export async function analysisProgress(embedKey: string) {
  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.embedKey, embedKey),
    columns: { id: true, userId: true, structure: true },
    with: { hypotheses: { columns: { id: true }, limit: 1 } }
  })

  if (!analysis) return null

  return {
    id: analysis.id,
    owned: analysis.userId !== null,
    measured: analysis.structure !== null,
    generated: analysis.hypotheses.length > 0
  }
}
