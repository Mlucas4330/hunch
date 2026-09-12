import { desc, eq, max } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, analysisRuns, flowFixes, hypotheses, pageSnapshots } from '@/db/schema'
import { generateFromMeasurement, measurePage } from '@/lib/analyze'
import { enqueue, jobId, jobRef, readJob, type RunOutcome } from '@/lib/queue'
import { analysisState } from '@/lib/analysis-state'
import { JOB_IN_FLIGHT, type AnalysisState } from '@/lib/enums'
import { snapshotValues } from '@/lib/snapshots'

export const ANALYSIS_JOB_KIND = 'analysis'

export type LatestRun = { id: string; finishedAt: Date | null; failedAt: Date | null }

export async function latestRun(analysisId: string): Promise<LatestRun | null> {
  const [run] = await db
    .select({ id: analysisRuns.id, finishedAt: analysisRuns.finishedAt, failedAt: analysisRuns.failedAt })
    .from(analysisRuns)
    .where(eq(analysisRuns.analysisId, analysisId))
    .orderBy(desc(analysisRuns.createdAt))
    .limit(1)

  return run ?? null
}

// When the lists on screen were written: the last run that finished.
export async function lastFinishedAt(analysisId: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: max(analysisRuns.finishedAt) })
    .from(analysisRuns)
    .where(eq(analysisRuns.analysisId, analysisId))

  return row?.at ?? null
}

async function jobInFlight(runId: string): Promise<boolean> {
  const job = await readJob(jobId(ANALYSIS_JOB_KIND, runId))
  return job !== null && JOB_IN_FLIGHT.includes(job.status)
}

/**
 * Whether the analysis has a run working right now. A run left unfinished with no job behind it was
 * lost to a restart past the job's TTL, and is recorded as failed so it stops counting.
 */
export async function runInFlight(analysisId: string): Promise<boolean> {
  const run = await latestRun(analysisId)
  if (!run || run.finishedAt || run.failedAt) return false
  if (await jobInFlight(run.id)) return true

  await markFailed(run.id)
  return false
}

/**
 * Where one analysis stands, for whoever is about to render it.
 *
 * The durable result is the rows, and the latest run's `failed_at` is the record of a run that threw.
 * "Is work happening right now" is the job, which is the one thing that knows. The job is read only
 * when the rows alone cannot settle the answer, because this is on the report's render path and the
 * client polls it. See lib/analysis-state.ts.
 */
export async function analysisStateFor(facts: {
  measured: boolean
  generated: boolean
  owned: boolean
  run: LatestRun | null
}): Promise<AnalysisState> {
  const { run, ...rest } = facts
  const base = { ...rest, failed: run?.failedAt != null }
  const unfinished = run !== null && run.finishedAt === null && run.failedAt === null

  const settled = analysisState({ ...base, running: unfinished })
  if (settled !== 'generating' && settled !== 'rerunning') return settled

  return analysisState({ ...base, running: run !== null && (await jobInFlight(run.id)) })
}

async function markFailed(runId: string): Promise<void> {
  await db.update(analysisRuns).set({ failedAt: new Date() }).where(eq(analysisRuns.id, runId))
}

/**
 * Records a run and queues its job. The job's ref is the run, not the analysis: `enqueue` hands back
 * a finished job for as long as its status lives, so a job keyed on the analysis could not run again
 * within that window. Null when there is no queue, with the run removed so it never counts.
 */
export async function startRun(analysisId: string, userId: string): Promise<{ runId: string } | null> {
  const [run] = await db
    .insert(analysisRuns)
    .values({ analysisId, userId })
    .returning({ id: analysisRuns.id })

  const job = await enqueue(jobId(ANALYSIS_JOB_KIND, run.id))
  if (!job || job.status === 'unavailable') {
    await db.delete(analysisRuns).where(eq(analysisRuns.id, run.id))
    return null
  }

  return { runId: run.id }
}

/**
 * The job behind every run: measure, store the measurement, generate the error lists, then replace
 * the lists on the analysis with the new ones.
 */
export async function runAnalysis(id: string): Promise<RunOutcome> {
  const run = await db.query.analysisRuns.findFirst({
    where: eq(analysisRuns.id, jobRef(id)),
    with: {
      analysis: { columns: { id: true, url: true, locale: true, competitorUrl: true } }
    }
  })

  if (!run?.analysis) return { ok: false }

  // A job the queue put back after a restart runs its handler a second time, so the handler has to be
  // able to say "already done".
  if (run.finishedAt || run.failedAt) return { ok: true }

  const { analysis } = run

  try {
    // Measured and stored first, so the PageSpeed section is current before the generation starts.
    const measurement = await measurePage(analysis.url, analysis.locale)

    // Skipped when this run already stored its measurement: a second snapshot for the same run would
    // be a second point in the trend at a moment nothing was measured again.
    if (!run.measuredAt) {
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
            sameness: measurement.sameness,
            pagespeed: measurement.pagespeed,
            siteCrawl: measurement.siteCrawl,
            backlinks: measurement.backlinks,
            rankedKeywords: measurement.rankedKeywords,
            // Re-detected from the page's own `lang`, a stronger signal than the URL the route had at
            // creation. See docs/invariants.md.
            market: measurement.market
          })
          .where(eq(analyses.id, analysis.id))

        await tx.insert(pageSnapshots).values(snapshotValues(analysis.id, measurement))
        await tx.update(analysisRuns).set({ measuredAt: new Date() }).where(eq(analysisRuns.id, run.id))
      })
    }

    const output = await generateFromMeasurement(analysis.url, measurement, {
      locale: analysis.locale,
      competitorUrl: analysis.competitorUrl
    })

    // Nothing at all is the failure condition. All three generators degrade to an empty list, so a
    // short list from one of them is still a finished report. `ok: false` rather than a throw: the
    // queue reads it as `unavailable`, and the report reads `failed_at`. The previous lists stay.
    if (output.hypotheses.length + output.playbook.length + output.visibility.length === 0) {
      await markFailed(run.id)
      return { ok: false }
    }

    const ranked = [...output.hypotheses].sort((a, b) => b.impact_score - a.impact_score)

    const rankedFixes = [
      ...[...output.playbook]
        .sort((a, b) => b.impact_score - a.impact_score)
        .map((fix, position) => ({ fix, kind: 'flow' as const, position })),
      ...[...output.visibility]
        .sort((a, b) => b.impact_score - a.impact_score)
        .map((fix, position) => ({ fix, kind: 'visibility' as const, position }))
    ]

    // One transaction, so a reader never sees the old lists half replaced.
    await db.transaction(async (tx) => {
      await tx
        .update(analyses)
        .set({ competitor: output.competitor })
        .where(eq(analyses.id, analysis.id))

      await tx.delete(hypotheses).where(eq(hypotheses.analysisId, analysis.id))
      await tx.delete(flowFixes).where(eq(flowFixes.analysisId, analysis.id))

      // Guarded: an insert with no values is invalid SQL, not a no-op.
      if (ranked.length) {
        await tx.insert(hypotheses).values(
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
      }

      if (rankedFixes.length) {
        await tx.insert(flowFixes).values(
          rankedFixes.map(({ fix, kind, position }) => ({
            analysisId: analysis.id,
            kind,
            category: fix.category,
            title: fix.title,
            problem: fix.problem,
            impactScore: fix.impact_score,
            evidence: fix.evidence,
            finding: fix.finding,
            position
          }))
        )
      }

      await tx.update(analysisRuns).set({ finishedAt: new Date() }).where(eq(analysisRuns.id, run.id))
    })

    return { ok: true }
  } catch (error) {
    await markFailed(run.id)
    throw error
  }
}

/**
 * What the client polls for. `state` is what the caller should switch on, and it comes from the same
 * helper the report renders from, so the screen and the poll cannot disagree.
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

  const run = await latestRun(analysis.id)
  const facts = {
    owned: analysis.userId !== null,
    measured: analysis.structure !== null,
    generated: analysis.hypotheses.length > 0 || analysis.flowFixes.length > 0
  }

  return {
    id: analysis.id,
    ...facts,
    failed: run?.failedAt != null,
    state: await analysisStateFor({ ...facts, run })
  }
}
