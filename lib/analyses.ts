import { cache } from 'react'
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, pageSnapshots, type Analysis, type FlowFix, type User } from '@/db/schema'
import { SNAPSHOT_HISTORY_MAX } from '@/lib/constants'
import { displayHost } from '@/lib/host'
import { AI_FIX_CATEGORY, type FixKind } from '@/lib/enums'
import { EMPTY_HISTORY, type ReadoutHistory } from '@/lib/snapshots'
import { isUuid } from '@/lib/uuid'
import type { PageSpeed } from '@/lib/pagespeed'
import type { BacklinkSummary, RankedKeywords } from '@/lib/seranking'
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
    | 'siteCrawl'
    | 'backlinks'
    | 'rankedKeywords'
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
    site: analysis.siteCrawl,
    backlinks: analysis.backlinks,
    rankedKeywords: analysis.rankedKeywords,
    market: analysis.market
  }
}

/**
 * The competitor's SE Ranking estimates, or null when the analysis named none or neither call answered
 * for it. Separate from `competitorFor`, which is null whenever PageSpeed failed for the competitor.
 */
export function competitorIndexFor(
  analysis: Pick<Analysis, 'competitor' | 'competitorUrl'>
): { host: string; backlinks: BacklinkSummary | null; rankedKeywords: RankedKeywords | null } | null {
  const competitor = analysis.competitor
  if (!competitor || (!competitor.backlinks && !competitor.rankedKeywords)) return null

  return {
    host: displayHost(analysis.competitorUrl ?? competitor.url),
    backlinks: competitor.backlinks ?? null,
    rankedKeywords: competitor.rankedKeywords ?? null
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

/** Where a page stands, and where it stood before the last run. `previous` is null until it has been run twice. */
export type ScoreStanding = { score: number; previous: number | null }

/**
 * How each of these analyses scores now and scored before, for the dashboard.
 *
 * **Two points rather than one**, because the dashboard's question is whether the work is paying off,
 * and a single number cannot answer it. The report carries the full trend; this is the glance.
 *
 * One query for the whole page rather than one per card. An analysis with no scored snapshot is
 * simply absent from the map, which is the same rule as everywhere else: a page PageSpeed could not
 * measure has no number, and never a zero. See docs/invariants.md.
 */
export async function latestScoresFor(analysisIds: string[]): Promise<Map<string, ScoreStanding>> {
  if (analysisIds.length === 0) return new Map()

  const rows = await db
    .select({
      analysisId: pageSnapshots.analysisId,
      score: pageSnapshots.score,
      capturedAt: pageSnapshots.capturedAt
    })
    .from(pageSnapshots)
    .where(
      and(inArray(pageSnapshots.analysisId, analysisIds), isNotNull(pageSnapshots.score))
    )
    .orderBy(desc(pageSnapshots.capturedAt))

  const standings = new Map<string, ScoreStanding>()

  for (const row of rows) {
    const score = row.score as number
    const standing = standings.get(row.analysisId)

    if (!standing) standings.set(row.analysisId, { score, previous: null })
    else if (standing.previous === null) standing.previous = score
  }

  return standings
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
