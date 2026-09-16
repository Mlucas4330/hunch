import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db'
import {
  analyses,
  analysisRuns,
  bulkBatchItems,
  bulkBatches,
  flowFixes,
  pageSnapshots
} from '@/db/schema'
import { batchFinished, type BatchItemState } from '@/lib/bulk'
import { severityForImpact } from '@/lib/constants'
import { displayHost } from '@/lib/host'

/**
 * What a batch is made of, read back for the results table and for the notification.
 *
 * Every number here is one the report already carries. Nothing is recomputed and nothing is
 * summarised: the main problem is the top error's own `business_impact` sentence, because writing a
 * second summariser would be a second thing to keep honest.
 */

export type BulkRow = {
  url: string
  host: string
  embedKey: string | null
  score: number | null
  criticalCount: number
  mainProblem: string | null
  failed: boolean
  finished: boolean
}

export type BulkBatch = {
  id: string
  createdAt: Date
  finished: boolean
  rows: BulkRow[]
}

export async function loadBatch(batchId: string, userId: string): Promise<BulkBatch | null> {
  const batch = await db.query.bulkBatches.findFirst({
    where: and(eq(bulkBatches.id, batchId), eq(bulkBatches.userId, userId))
  })

  if (!batch) return null

  const items = await db
    .select({ url: bulkBatchItems.url, analysisId: bulkBatchItems.analysisId })
    .from(bulkBatchItems)
    .where(eq(bulkBatchItems.batchId, batchId))
    .orderBy(bulkBatchItems.createdAt)

  const analysisIds = items
    .map((item) => item.analysisId)
    .filter((id): id is string => id !== null)

  const [meta, runs, scores, errors] = await Promise.all([
    analysisIds.length
      ? db
          .select({ id: analyses.id, embedKey: analyses.embedKey })
          .from(analyses)
          .where(inArray(analyses.id, analysisIds))
      : [],
    analysisIds.length
      ? db
          .select({
            analysisId: analysisRuns.analysisId,
            finishedAt: analysisRuns.finishedAt,
            failedAt: analysisRuns.failedAt,
            createdAt: analysisRuns.createdAt
          })
          .from(analysisRuns)
          .where(inArray(analysisRuns.analysisId, analysisIds))
          .orderBy(desc(analysisRuns.createdAt))
      : [],
    analysisIds.length
      ? db
          .select({
            analysisId: pageSnapshots.analysisId,
            score: pageSnapshots.score,
            capturedAt: pageSnapshots.capturedAt
          })
          .from(pageSnapshots)
          .where(inArray(pageSnapshots.analysisId, analysisIds))
          .orderBy(desc(pageSnapshots.capturedAt))
      : [],
    analysisIds.length
      ? db
          .select({
            analysisId: flowFixes.analysisId,
            impactScore: flowFixes.impactScore,
            businessImpact: flowFixes.businessImpact
          })
          .from(flowFixes)
          .where(inArray(flowFixes.analysisId, analysisIds))
          .orderBy(desc(flowFixes.impactScore))
      : []
  ])

  const embedKeys = new Map(meta.map((row) => [row.id, row.embedKey]))

  const latestRun = new Map<string, BatchItemState>()
  for (const run of runs) {
    if (!run.analysisId || latestRun.has(run.analysisId)) continue
    latestRun.set(run.analysisId, { finishedAt: run.finishedAt, failedAt: run.failedAt })
  }

  const latestScore = new Map<string, number>()
  for (const snapshot of scores) {
    if (snapshot.score === null || latestScore.has(snapshot.analysisId)) continue
    latestScore.set(snapshot.analysisId, snapshot.score)
  }

  const criticals = new Map<string, number>()
  const topProblem = new Map<string, string>()
  for (const error of errors) {
    if (severityForImpact(error.impactScore) === 'critical') {
      criticals.set(error.analysisId, (criticals.get(error.analysisId) ?? 0) + 1)
    }

    // The list arrives ranked, so the first one seen for an analysis is its highest impact.
    if (error.businessImpact && !topProblem.has(error.analysisId)) {
      topProblem.set(error.analysisId, error.businessImpact)
    }
  }

  const rows: BulkRow[] = items.map((item) => {
    const run = item.analysisId ? (latestRun.get(item.analysisId) ?? null) : null
    const failed = run?.failedAt != null
    const finished = run?.finishedAt != null

    return {
      url: item.url,
      host: displayHost(item.url),
      embedKey: item.analysisId ? (embedKeys.get(item.analysisId) ?? null) : null,
      // A failed run measured nothing, and a number beside it would be from the run before it.
      score: failed || !item.analysisId ? null : (latestScore.get(item.analysisId) ?? null),
      criticalCount: item.analysisId ? (criticals.get(item.analysisId) ?? 0) : 0,
      mainProblem: item.analysisId ? (topProblem.get(item.analysisId) ?? null) : null,
      failed,
      finished
    }
  })

  return {
    id: batch.id,
    createdAt: batch.createdAt,
    finished: batchFinished(items.map((item) => (item.analysisId ? latestRun.get(item.analysisId) ?? null : null))),
    rows
  }
}

export type BatchNotice = { id: string; total: number }

/**
 * A finished batch this account has not opened yet, for the badge in the nav.
 *
 * Read rather than pushed: the worker is in the same process, but a notification written from it
 * would be a second record of a fact the run rows already carry.
 */
export async function unreadBatch(userId: string): Promise<BatchNotice | null> {
  const batch = await db.query.bulkBatches.findFirst({
    where: and(eq(bulkBatches.userId, userId), isNull(bulkBatches.readAt)),
    orderBy: (table, { desc: order }) => [order(table.createdAt)]
  })

  if (!batch) return null

  const loaded = await loadBatch(batch.id, userId)
  if (!loaded?.finished) return null

  return { id: batch.id, total: loaded.rows.length }
}

export async function markBatchRead(batchId: string, userId: string): Promise<void> {
  await db
    .update(bulkBatches)
    .set({ readAt: new Date() })
    .where(and(eq(bulkBatches.id, batchId), eq(bulkBatches.userId, userId)))
}
