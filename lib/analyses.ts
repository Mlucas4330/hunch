import { cache } from 'react'
import { desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, pageSnapshots, type Analysis, type FlowFix, type User } from '@/db/schema'
import { SNAPSHOT_HISTORY_MAX } from '@/lib/constants'
import { displayHost } from '@/lib/host'
import { AI_FIX_CATEGORY, type FixKind } from '@/lib/enums'
import { EMPTY_HISTORY, type ReadoutHistory } from '@/lib/snapshots'
import { isUuid } from '@/lib/uuid'
import type { PageSpeed } from '@/lib/pagespeed'
import type { ReadoutInput } from '@/lib/readout'

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 10

const PagingSchema = z.coerce.number().int().positive().optional().catch(undefined)

/**
 * Reads a page number off a query string, for the dashboard and for `GET /api/analyses` alike.
 * Anything that is not a positive integer comes back `undefined`, which reads as page one.
 */
export function parsePaging(value: string | null | undefined): number | undefined {
  return PagingSchema.parse(value ?? undefined)
}

// The report's one query, authorized by the opaque embed key alone. `cache()`d because the page and
// its OG route both call it.
export const loadReport = cache(async (embedKey: string) => {
  if (!isUuid(embedKey)) return null

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.embedKey, embedKey),
    with: {
      hypotheses: true,
      flowFixes: { orderBy: (f, { asc }) => asc(f.position) },
      user: { columns: { brandName: true, brandLogoUrl: true } }
    }
  })

  return analysis ?? null
})

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

/**
 * Which errors answer which measured finding or PageSpeed audit, keyed by its id, so a number on the
 * report can point at the card written about it. An array per id: nothing stops two errors answering
 * one number.
 */
export function fixesByFinding(fixes: FlowFix[]): Map<string, FlowFix[]> {
  const out = new Map<string, FlowFix[]>()

  for (const fix of fixes) {
    if (!fix.finding) continue

    const existing = out.get(fix.finding)
    if (existing) existing.push(fix)
    else out.set(fix.finding, [fix])
  }

  return out
}

export function readoutFor(
  analysis: Pick<
    Analysis,
    | 'structure'
    | 'seo'
    | 'performance'
    | 'crawlerAccess'
    | 'keywords'
    | 'mobile'
    | 'sameness'
    | 'market'
  >
): ReadoutInput {
  return {
    structure: analysis.structure,
    seo: analysis.seo,
    performance: analysis.performance,
    crawler: analysis.crawlerAccess,
    keywords: analysis.keywords,
    mobile: analysis.mobile,
    sameness: analysis.sameness,
    market: analysis.market
  }
}

/**
 * The competitor's PageSpeed scores, or nulls when the analysis named none or the call failed for it.
 */
export function competitorFor(
  analysis: Pick<Analysis, 'competitor' | 'competitorUrl'>
): { competitor: PageSpeed | null; competitorHost: string | null } {
  if (!analysis.competitor?.pagespeed) return { competitor: null, competitorHost: null }

  return {
    competitor: analysis.competitor.pagespeed,
    // The hostname, never the path.
    competitorHost: displayHost(analysis.competitorUrl ?? analysis.competitor.url)
  }
}

export async function readoutHistory(analysisId: string): Promise<ReadoutHistory> {
  const rows = await db
    .select()
    .from(pageSnapshots)
    .where(eq(pageSnapshots.analysisId, analysisId))
    .orderBy(desc(pageSnapshots.capturedAt))
    .limit(SNAPSHOT_HISTORY_MAX)

  // One snapshot is the current measurement, not a history.
  if (rows.length < 2) return EMPTY_HISTORY

  return {
    previous: rows[1].pagespeed,
    scores: rows
      .filter((row) => row.score !== null)
      .map((row) => ({ score: row.score as number, capturedAt: row.capturedAt }))
      .reverse()
  }
}

export async function listAnalysesForUser(
  user: Pick<User, 'id'>,
  options: { page?: number; limit?: number } = {}
): Promise<{ rows: Analysis[]; total: number; page: number; pages: number }> {
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, options.limit ?? DEFAULT_PAGE_SIZE))

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .where(eq(analyses.userId, user.id))

  // A page past the end is clamped, never answered empty.
  const pages = Math.max(1, Math.ceil(count / limit))
  const page = Math.min(pages, Math.max(1, options.page ?? 1))

  const rows = await db
    .select()
    .from(analyses)
    .where(eq(analyses.userId, user.id))
    .orderBy(desc(analyses.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return { rows, total: count, page, pages }
}
