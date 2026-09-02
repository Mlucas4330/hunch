import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, flowFixes, hypotheses, pageSnapshots, variants } from '@/db/schema'
import { generateFromMeasurement, measurePage } from '@/lib/analyze'
import { refundCredit, wasRefunded } from '@/lib/credits'
import { jobId, jobRef, readJob, type RunOutcome } from '@/lib/queue'
import { analysisState } from '@/lib/analysis-state'
import { JOB_IN_FLIGHT, type AnalysisState } from '@/lib/enums'
import { snapshotValues } from '@/lib/snapshots'

export const ANALYSIS_JOB_KIND = 'analysis'

/**
 * Where one analysis stands, for whoever is about to render it.
 *
 * **Three sources, and each answers the only question it can.** The durable result is the row. "Is
 * work happening right now" is the job, which is the one thing that knows and the one thing the row
 * deliberately does not record. "Did the generation fail" is the credit ledger, because a refund is
 * written from exactly one place and outlives the job's ten minute TTL. `analysisState` puts them in
 * order; see lib/analysis-state.ts for why that order is what it is.
 *
 * **The two reads are paid for only when they can change the answer.** A row that is not measured, or
 * already generated, or ownerless is settled before either of them runs -- which matters because this
 * is on the report's render path and the client polls it.
 *
 * Redis down means no job, so `running` is false and an analysis genuinely still working reads as
 * `locked`. That is the right way round: a wall on a report that is quietly still going is fixed by
 * reloading, and a placeholder that will never fill is not.
 */
export async function analysisStateFor(facts: {
  id: string
  measured: boolean
  generated: boolean
  owned: boolean
}): Promise<AnalysisState> {
  const settled = analysisState({ ...facts, running: false, refunded: false })
  if (settled !== 'locked' || !facts.owned) return settled

  const [job, refunded] = await Promise.all([
    readJob(jobId(ANALYSIS_JOB_KIND, facts.id)),
    wasRefunded(facts.id)
  ])

  return analysisState({
    ...facts,
    running: job !== null && JOB_IN_FLIGHT.includes(job.status),
    refunded
  })
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
    with: {
      hypotheses: { columns: { id: true }, limit: 1 },
      // **Both lists, because a report can now have one and not the other.** The copy call degrades
      // to empty instead of failing the analysis, so an owned row with flow fixes and no hypotheses
      // is a finished report -- and a guard counting only hypotheses would let a requeued job
      // regenerate it and insert a second set of fixes beside the first. Same predicate the report
      // surface uses for `generated`. See docs/report.md.
      flowFixes: { columns: { id: true }, limit: 1 }
    }
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
  const alreadyGenerated = analysis.hypotheses.length > 0 || analysis.flowFixes.length > 0
  if (analysis.structure !== null && (!analysis.userId || alreadyGenerated)) {
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

  // The credit was spent before the job was queued, so work that cannot be delivered has to give it
  // back. The readout above is already committed either way, so the reader keeps their score whatever
  // happens here.
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
    // A real exception: the network, the process, something that never got as far as an answer.
    await refundCredit(analysis.userId, analysis.id)
    throw error
  }

  // **What a credit buys, checked over everything that came back.**
  //
  // This used to be a schema floor: `AnalysisOutputSchema` required five hypotheses and rejecting
  // that threw, which is how the refund was reached. The floor was in the wrong place. All three
  // generators run in one `Promise.all` and the other two degrade to an empty list, so a fourth
  // hypothesis coming back short discarded a finished flow playbook and a finished visibility audit
  // along with it -- tokens already spent, work already done, thrown away over one line.
  //
  // Nothing at all is the honest condition, and it is what "paid for a call and got nothing" always
  // meant. `ok: false` rather than a throw: the queue reads that as `unavailable`, which lib/queue.ts
  // defines as work that cannot succeed for this input -- true here, and not a crash worth logging as
  // one. Either way the reader lands on the same screen, because the report reads the refund from the
  // ledger and not from how the job ended. See docs/report.md.
  if (output.hypotheses.length + output.playbook.length + output.visibility.length === 0) {
    await refundCredit(analysis.userId, analysis.id)
    return { ok: false }
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

    // Guarded, like `rankedFixes` below and for a reason that is new: the copy call now degrades to
    // an empty list instead of failing the analysis, so "flow fixes but no hypotheses" is a report
    // that can exist -- and an insert with no values is not a no-op, it is invalid SQL.
    if (ranked.length) {
      const rows = await tx
        .insert(hypotheses)
        .values(
          ranked.map((h) => ({
            analysisId: analysis.id,
            section: h.section,
            assessment: h.assessment,
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
    }

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
 * What the client polls for. `measured` is what unlocks the readout; `generated` is what unlocks the
 * fixes; `state` is what the caller should actually switch on.
 *
 * **`state` is here so the poll can stop.** The booleans say what has landed and never why nothing
 * more is coming, so a client watching them had no way to tell a generation still running from one
 * that threw an hour ago -- it just kept asking. The report renders from this same helper, so the
 * screen and the poll cannot disagree about the same row.
 */
export async function analysisProgress(embedKey: string) {
  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.embedKey, embedKey),
    columns: { id: true, userId: true, structure: true },
    with: {
      hypotheses: { columns: { id: true }, limit: 1 },
      flowFixes: { columns: { id: true }, limit: 1 }
    }
  })

  if (!analysis) return null

  const facts = {
    id: analysis.id,
    owned: analysis.userId !== null,
    measured: analysis.structure !== null,
    // **Both lists, and the same predicate the page uses.** Counting only hypotheses was safe while
    // the copy call could not come back empty; now it can, and a report with flow fixes and no copy
    // would have this endpoint answering `generating` forever while the screen rendered the finished
    // document -- so `GeneratingSections` would poll until its deadline over a report already on
    // screen. See docs/report.md.
    generated: analysis.hypotheses.length > 0 || analysis.flowFixes.length > 0
  }

  return { ...facts, state: await analysisStateFor(facts) }
}
