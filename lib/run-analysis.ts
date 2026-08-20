import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, flowFixes, hypotheses, pageSnapshots, variants } from '@/db/schema'
import { analyzeLandingPage, measurePage } from '@/lib/analyze'
import { refundCredit } from '@/lib/credits'
import { jobRef, type RunOutcome } from '@/lib/queue'
import { snapshotValues } from '@/lib/snapshots'

export const ANALYSIS_JOB_KIND = 'analysis'

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
    columns: { id: true, url: true, userId: true, brief: true, locale: true }
  })

  if (!analysis) return { ok: false }

  if (!analysis.userId) {
    const measurement = await measurePage(analysis.url)

    await db.transaction(async (tx) => {
      await tx
        .update(analyses)
        .set({
          structure: measurement.structure,
          seo: measurement.seo,
          performance: measurement.performance,
          crawlerAccess: measurement.crawlerAccess,
          keywords: measurement.keywords
        })
        .where(eq(analyses.id, analysis.id))

      await tx.insert(pageSnapshots).values(snapshotValues(analysis.id, measurement))
    })

    return { ok: true }
  }

  // The credit was spent before the job was queued, so a generation that throws has to give it back.
  // `AnalysisOutputSchema` has a `.min(5)` that deliberately does not degrade, which makes "paid for a
  // Sonnet call and got nothing" a real path rather than a theoretical one. See docs/api.md.
  let output
  try {
    output = await analyzeLandingPage(analysis.url, {
      brief: analysis.brief ?? undefined,
      locale: analysis.locale
    })
  } catch (error) {
    await refundCredit(analysis.userId, analysis.id)
    throw error
  }

  const ranked = [...output.hypotheses].sort((a, b) => b.impact_score - a.impact_score)

  await db.transaction(async (tx) => {
    await tx
      .update(analyses)
      .set({
        structure: output.structure,
        seo: output.seo,
        performance: output.performance,
        crawlerAccess: output.crawlerAccess,
        keywords: output.keywords,
        market: output.market
      })
      .where(eq(analyses.id, analysis.id))

    await tx.insert(pageSnapshots).values(snapshotValues(analysis.id, output))

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
