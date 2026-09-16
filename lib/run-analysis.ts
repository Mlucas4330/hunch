import { and, desc, eq, gt, inArray, isNotNull, isNull, max, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, analysisRuns, flowFixes, hypotheses, pageSnapshots, users } from '@/db/schema'
import { generateFromMeasurement, measurePage } from '@/lib/analyze'
import { enqueue, jobId, jobRef, readJob, type RunOutcome } from '@/lib/queue'
import { analysisState } from '@/lib/analysis-state'
import { JOB_IN_FLIGHT, type AnalysisState } from '@/lib/enums'
import { log } from '@/lib/log'
import { SCREENSHOT_PRUNE_BATCH, SNAPSHOT_HISTORY_MAX } from '@/lib/constants'
import { deleteScreenshot, saveScreenshot, screenshotStorageReady } from '@/lib/screenshots'
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

/**
 * Marks a run failed and gives back what it took.
 *
 * A failed run does not count against the quota, and the monthly half of that is free: the count
 * ignores rows with a `failed_at`. The trial half is not, because it was spent by decrementing a
 * column, so it has to be put back, and only for a run that actually took it.
 */
async function markFailed(runId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [run] = await tx
      .update(analysisRuns)
      .set({ failedAt: new Date() })
      .where(and(eq(analysisRuns.id, runId), isNull(analysisRuns.failedAt)))
      .returning({ userId: analysisRuns.userId, trial: analysisRuns.trial })

    if (!run?.trial) return

    await tx
      .update(users)
      .set({ trialRunsLeft: sql`${users.trialRunsLeft} + 1` })
      .where(eq(users.id, run.userId))
  })
}

/**
 * Records a run, charges it to the account, and queues its job.
 *
 * **The charge and the run are one transaction, and the trial is spent by a conditional update.**
 * A route that checks the quota and then inserts leaves a window two requests can both pass through;
 * `where trial_runs_left > 0 ... returning` cannot be won twice. The routes still answer 403 from
 * `quotaLeft` first, because that is the fast and friendly reply. This is the boundary.
 *
 * The job's ref is the run, not the analysis: `enqueue` hands back a finished job for as long as its
 * status lives, so a job keyed on the analysis could not run again within that window. Null when
 * there is no queue, with the run removed so it never counts.
 */
export async function startRun(analysisId: string, userId: string): Promise<{ runId: string } | null> {
  const run = await db.transaction(async (tx) => {
    const [charged] = await tx
      .update(users)
      .set({ trialRunsLeft: sql`${users.trialRunsLeft} - 1` })
      .where(and(eq(users.id, userId), gt(users.trialRunsLeft, 0)))
      .returning({ id: users.id })

    const [inserted] = await tx
      .insert(analysisRuns)
      .values({ analysisId, userId, trial: charged !== undefined })
      .returning({ id: analysisRuns.id })

    return inserted
  })

  const job = await enqueue(jobId(ANALYSIS_JOB_KIND, run.id))
  if (!job || job.status === 'unavailable') {
    // The run never happened, so whatever it was charged goes back.
    await markFailed(run.id)
    await db.delete(analysisRuns).where(eq(analysisRuns.id, run.id))
    return null
  }

  return { runId: run.id }
}

/**
 * The screenshot on the volume, or null.
 *
 * **Every way this can go wrong ends in null**: no volume configured, no shot taken, or a write that
 * failed. The report then shows no picture, which is the honest answer, rather than a frame pointing
 * at a file nobody wrote.
 */
async function storeScreenshot(image: Buffer | undefined): Promise<string | null> {
  if (!image || !screenshotStorageReady()) return null

  try {
    return await saveScreenshot(image)
  } catch (error) {
    log.error('screenshot.write_failed', error)
    return null
  }
}

/**
 * Deletes the screenshots of snapshots that have fallen out of the trend.
 *
 * **Only superseded ones, and never the one on `analyses`.** A report stays online behind its link
 * for as long as the agency keeps sending it, so the current picture is kept for good; what the
 * trend needs from an old snapshot is its score, not a twelfth photograph of the same page.
 *
 * Runs after the snapshot was written, outside its transaction, and swallows everything. A file
 * left behind costs disk; a throw here would cost the run that just measured the page.
 */
async function pruneSupersededScreenshots(analysisId: string): Promise<void> {
  try {
    const stale = await db
      .select({ id: pageSnapshots.id, url: pageSnapshots.mobileScreenshotUrl })
      .from(pageSnapshots)
      .where(
        and(
          eq(pageSnapshots.analysisId, analysisId),
          isNotNull(pageSnapshots.mobileScreenshotUrl)
        )
      )
      .orderBy(desc(pageSnapshots.capturedAt))
      .offset(SNAPSHOT_HISTORY_MAX)
      .limit(SCREENSHOT_PRUNE_BATCH)

    if (stale.length === 0) return

    // The column is cleared first. A row still pointing at a deleted file renders a broken frame,
    // which is the one outcome worse than no picture.
    await db
      .update(pageSnapshots)
      .set({ mobileScreenshotUrl: null })
      .where(
        inArray(
          pageSnapshots.id,
          stale.map((row) => row.id)
        )
      )

    const kept = new Set(
      (
        await db
          .select({ url: analyses.mobileScreenshotUrl })
          .from(analyses)
          .where(eq(analyses.id, analysisId))
      )
        .map((row) => row.url)
        .filter((url): url is string => url !== null)
    )

    for (const row of stale) {
      if (row.url && !kept.has(row.url)) await deleteScreenshot(row.url)
    }
  } catch (error) {
    log.error('screenshot.prune_failed', error, { analysis: analysisId })
  }
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

    // Written before the transaction, because it is a file rather than a row: a failed write leaves
    // the report without its picture, and must not cost the reader the measurement beside it.
    const screenshotUrl = await storeScreenshot(measurement.screenshot)

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
            market: measurement.market,
            // A run whose screenshot failed keeps the one the last run wrote: an older picture of
            // the same page is closer to the truth than no picture. `undefined` is how drizzle is
            // told to leave a column alone.
            mobileScreenshotUrl: screenshotUrl ?? undefined
          })
          .where(eq(analyses.id, analysis.id))

        await tx
          .insert(pageSnapshots)
          .values({ ...snapshotValues(analysis.id, measurement), mobileScreenshotUrl: screenshotUrl })
        await tx.update(analysisRuns).set({ measuredAt: new Date() }).where(eq(analysisRuns.id, run.id))
      })

      if (screenshotUrl) await pruneSupersededScreenshots(analysis.id)
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
            businessImpact: h.business_impact,
            selector: h.selector,
            target: h.target,
            // Only an element the scrape actually resolved has a box, and only in the phone layout.
            // See docs/report.md.
            elementRect: h.selector ? (measurement.elementRects?.[h.selector] ?? null) : null
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
            businessImpact: fix.business_impact,
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
