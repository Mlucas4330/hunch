import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { desc, eq, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, pageSnapshots, type Analysis, type FlowFix, type User } from '@/db/schema'
import {
  PULSE_CACHE_SECONDS,
  PULSE_FEED_MAX,
  PULSE_RUNNING_MAX_AGE_MS,
  PULSE_SPHERE_MAX,
  SNAPSHOT_HISTORY_MAX
} from '@/lib/constants'
import { displayHost } from '@/lib/host'
import {
  AI_FIX_CATEGORY,
  isReadoutFinding,
  type FixKind,
  type Market,
  type PulseState,
  type ReadoutFinding
} from '@/lib/enums'
import { competitorInput } from '@/lib/competitor'
import { EMPTY_HISTORY, snapshotInput, type ReadoutHistory } from '@/lib/snapshots'
import { isUuid } from '@/lib/uuid'
import type { ReadoutInput } from '@/lib/readout'

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 10

const PagingSchema = z.coerce.number().int().positive().optional().catch(undefined)

/**
 * Reads a page number off a query string, for the dashboard and for `GET /api/analyses` alike.
 *
 * Anything that is not a positive integer comes back `undefined`, which `listAnalysesForUser` reads
 * as page one — a hand-edited `?page=banana` is a typo, not an error worth a screen. It lives here
 * rather than in either caller because both are reading the same parameter for the same query, and a
 * second copy is what lets the two drift.
 */
export function parsePaging(value: string | null | undefined): number | undefined {
  return PagingSchema.parse(value ?? undefined)
}

// The public report's one query, authorized by the opaque embed key alone. It moved here from
// lib/report.ts when white-label was removed: that file existed to resolve a brand, and the brand is
// gone, but the lookup is not. It stays `cache()`d because the page and its OG route both call it.
export const loadReport = cache(async (embedKey: string) => {
  if (!isUuid(embedKey)) return null

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.embedKey, embedKey),
    with: {
      hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.position) } } },
      flowFixes: { orderBy: (f, { asc }) => asc(f.position) }
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
 * Which fixes answer which measured finding.
 *
 * **This is the join the reader used to do in their head.** The readout counts 43 things above and
 * the tabs carry up to 20 generated cards below, and until `flow_fixes.finding` existed nothing tied
 * one to the other -- correlating "form has 7 fields" with "cut the form to three" was a matter of
 * recognising the words.
 *
 * An array per finding rather than a single fix: nothing stops two fixes answering one number, and
 * silently dropping the second would be a worse answer than showing both.
 *
 * **Rows written before the column existed carry `null`, and so do fixes no measurement backs** --
 * nothing counts whether an action is repeated further down the page. Both are the same absence here
 * and both are correct.
 */
export function fixesByFinding(fixes: FlowFix[]): Map<ReadoutFinding, FlowFix[]> {
  const out = new Map<ReadoutFinding, FlowFix[]>()

  for (const fix of fixes) {
    if (!fix.finding || !isReadoutFinding(fix.finding)) continue

    const existing = out.get(fix.finding)
    if (existing) existing.push(fix)
    else out.set(fix.finding, [fix])
  }

  return out
}

export function readoutFor(
  analysis: Pick<
    Analysis,
    'structure' | 'seo' | 'performance' | 'crawlerAccess' | 'keywords' | 'mobile' | 'market'
  >
): ReadoutInput {
  return {
    structure: analysis.structure,
    seo: analysis.seo,
    performance: analysis.performance,
    crawler: analysis.crawlerAccess,
    keywords: analysis.keywords,
    mobile: analysis.mobile,
    market: analysis.market
  }
}

/**
 * The competitor half of the readout, or nulls when the analysis named none.
 *
 * Beside `readoutFor` rather than inside it: the two are different pages and the component takes
 * them as different props, precisely so the report can never render "they have 3 more" in the cell
 * that means "you improved by 3".
 */
export function competitorFor(
  analysis: Pick<Analysis, 'competitor' | 'competitorUrl' | 'market'>
): { competitor: ReadoutInput | null; competitorHost: string | null } {
  if (!analysis.competitor) return { competitor: null, competitorHost: null }

  return {
    competitor: competitorInput(analysis.competitor, analysis.market),
    // The hostname, never the path: a competitor's URL is as likely to be an unlisted campaign page
    // as the reader's own, and the board already reduces one for the same reason.
    competitorHost: displayHost(analysis.competitorUrl ?? analysis.competitor.url)
  }
}

export async function readoutHistory(
  analysisId: string,
  market: Market
): Promise<ReadoutHistory> {
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
    previous: snapshotInput(rows[1], market),
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

  // Counted before the rows are fetched, because the count is what says which page exists.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .where(eq(analyses.userId, user.id))

  // **A page past the end is clamped, never answered empty.** Asking for page nine of a three page
  // list is a stale link or a row someone just deleted, and handing back nothing renders as the
  // empty state -- which tells a reader with plenty of analyses that they have none. `pages` is
  // floored at one so an account with nothing still has a page to be on.
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

// --- The landing page's public proof ---------------------------------------------------------
//
// Two reads, and everything they return is something code already counted: a domain and a score that
// `snapshotValues` froze at capture. **Neither may ever widen.** The embed key is the only thing
// authorizing a report, the URL's path is the customer's, and the owner is nobody's business, so the
// shapes below carry a hostname and a number and nothing that could be joined back to a person. See
// docs/security.md.

export type PublicScore = { domain: string; score: number }

export type PulseEntry = { domain: string; state: PulseState; score: number | null; at: string }

// The current score of every analysis, one row each. `distinct on` needs the ordering to lead with
// the key, so ranking cannot happen here -- it happens in the queries below.
function latestScores() {
  return db
    .selectDistinctOn([pageSnapshots.analysisId], {
      analysisId: pageSnapshots.analysisId,
      score: pageSnapshots.score
    })
    .from(pageSnapshots)
    .where(isNotNull(pageSnapshots.score))
    .orderBy(pageSnapshots.analysisId, desc(pageSnapshots.capturedAt))
    .as('latest_scores')
}

// One entry per domain, best score wins. The same page gets measured many times -- by its owner, by
// the re-measure cron, by a stranger who pasted the same URL -- and a board listing it four times is
// a board about our traffic rather than about pages.
function byBestScore(rows: { url: string; score: number | null }[], limit: number): PublicScore[] {
  const best = new Map<string, number>()

  for (const row of rows) {
    if (row.score === null) continue
    const domain = displayHost(row.url)
    const seen = best.get(domain)
    if (seen === undefined || row.score > seen) best.set(domain, row.score)
  }

  return [...best]
    .map(([domain, score]) => ({ domain, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * The ranked board behind the sphere and the top list.
 *
 * Cached rather than queried per poll: the answer is the same for every reader on the page, and the
 * landing page is the one surface strangers hit in bursts.
 */
export const publicLeaderboard = unstable_cache(
  async (): Promise<PublicScore[]> => {
    const latest = latestScores()

    // Deliberately over-fetched: deduplicating by domain happens after the ranking, so taking exactly
    // the limit here would return fewer rows than asked for whenever a page was measured twice.
    const rows = await db
      .select({ url: analyses.url, score: latest.score })
      .from(latest)
      .innerJoin(analyses, eq(analyses.id, latest.analysisId))
      .orderBy(desc(latest.score))
      .limit(PULSE_SPHERE_MAX * 4)

    return byBestScore(rows, PULSE_SPHERE_MAX)
  },
  ['public-leaderboard'],
  { revalidate: PULSE_CACHE_SECONDS }
)

/**
 * What the tool is doing right now, newest first.
 *
 * The state is derived from the columns rather than stored: a row with no `structure` has not been
 * measured yet. That reads as `running` only while it still could be -- an hour later the same row is
 * a job that died, and announcing it would be the one thing this feed must not do, which is state
 * something nobody observed.
 */
export const analysisPulse = unstable_cache(
  async (): Promise<PulseEntry[]> => {
    const latest = latestScores()
    const runningSince = new Date(Date.now() - PULSE_RUNNING_MAX_AGE_MS)

    const rows = await db
      .select({
        url: analyses.url,
        createdAt: analyses.createdAt,
        measured: sql<boolean>`${analyses.structure} is not null`,
        score: latest.score
      })
      .from(analyses)
      .leftJoin(latest, eq(latest.analysisId, analyses.id))
      .orderBy(desc(analyses.createdAt))
      .limit(PULSE_FEED_MAX * 4)

    // One line per domain, newest first. The same page is measured over and over -- by its owner
    // after a change, by the re-measure cron -- and a feed that says the same name twelve times
    // running reads as a fake ticker rather than as what the tool is doing.
    const seen = new Set<string>()
    const feed: PulseEntry[] = []

    for (const row of rows) {
      if (!row.measured && row.createdAt <= runningSince) continue

      const domain = displayHost(row.url)
      if (seen.has(domain)) continue
      seen.add(domain)

      const state: PulseState = row.measured ? 'done' : 'running'
      feed.push({
        domain,
        state,
        score: row.measured ? row.score : null,
        at: row.createdAt.toISOString()
      })

      if (feed.length === PULSE_FEED_MAX) break
    }

    return feed
  },
  ['analysis-pulse'],
  { revalidate: PULSE_CACHE_SECONDS }
)
