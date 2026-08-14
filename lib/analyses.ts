import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, pageSnapshots, type Analysis, type FlowFix, type User } from '@/db/schema'
import { FREE_ANALYSES_LIMIT, SNAPSHOT_HISTORY_MAX } from '@/lib/constants'
import { AI_FIX_CATEGORY, type FixKind } from '@/lib/enums'
import { EMPTY_HISTORY, snapshotInput, type ReadoutHistory } from '@/lib/snapshots'
import type { ReadoutInput } from '@/lib/readout'

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 10

export function splitFixes(fixes: FlowFix[]): Record<FixKind, FlowFix[]> {
  return {
    flow: fixes.filter((fix) => fix.kind === 'flow'),
    visibility: fixes.filter((fix) => fix.kind === 'visibility')
  }
}

export function splitVisibility(fixes: FlowFix[]): { seo: FlowFix[]; ai: FlowFix[] } {
  const visibility = splitFixes(fixes).visibility
  return {
    seo: visibility.filter((fix) => fix.category !== AI_FIX_CATEGORY),
    ai: visibility.filter((fix) => fix.category === AI_FIX_CATEGORY)
  }
}

export function readoutFor(
  analysis: Pick<
    Analysis,
    'structure' | 'seo' | 'performance' | 'crawlerAccess' | 'keywords' | 'competitorStructures'
  >
): ReadoutInput {
  return {
    structure: analysis.structure,
    seo: analysis.seo,
    performance: analysis.performance,
    crawler: analysis.crawlerAccess,
    keywords: analysis.keywords,
    competitors: analysis.competitorStructures
  }
}

export async function readoutHistory(analysisId: string): Promise<ReadoutHistory> {
  const rows = await db
    .select()
    .from(pageSnapshots)
    .where(eq(pageSnapshots.analysisId, analysisId))
    .orderBy(desc(pageSnapshots.capturedAt))
    .limit(SNAPSHOT_HISTORY_MAX)

  // One snapshot is the current measurement, not a history: there is nothing to compare it against
  // and a one point line is a decoration.
  if (rows.length < 2) return EMPTY_HISTORY

  return {
    previous: snapshotInput(rows[1]),
    scores: rows
      .filter((row) => row.score !== null)
      .map((row) => ({ score: row.score as number, capturedAt: row.capturedAt }))
      .reverse()
  }
}

export async function listAnalysesForUser(
  user: Pick<User, 'id' | 'plan'>,
  options: { page?: number; limit?: number } = {}
): Promise<{ rows: Analysis[]; total: number; page: number }> {
  const free = user.plan === 'free'
  const page = free ? 1 : Math.max(1, options.page ?? 1)
  const limit = free
    ? FREE_ANALYSES_LIMIT
    : Math.min(MAX_PAGE_SIZE, Math.max(1, options.limit ?? DEFAULT_PAGE_SIZE))

  const rows = await db
    .select()
    .from(analyses)
    .where(eq(analyses.userId, user.id))
    .orderBy(desc(analyses.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .where(eq(analyses.userId, user.id))

  return { rows, total: count, page }
}
