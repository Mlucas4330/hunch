import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, type Analysis, type FlowFix, type User } from '@/db/schema'
import { FREE_ANALYSES_LIMIT } from '@/lib/constants'
import { AI_FIX_CATEGORY, type FixKind } from '@/lib/enums'
import type { ReadoutInput } from '@/lib/readout'

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 10

// The flow playbook and the visibility audit share one table, so every surface that renders them has
// to split the rows the same way. Done here rather than at each call site: three pages render both
// lists, and a page that forgot to filter would silently show conversion fixes under the
// discoverability heading.
export function splitFixes(fixes: FlowFix[]): Record<FixKind, FlowFix[]> {
  return {
    flow: fixes.filter((fix) => fix.kind === 'flow'),
    visibility: fixes.filter((fix) => fix.kind === 'visibility')
  }
}

// The second cut, made only by the two tabbed surfaces: `ai_answerability` is what decides whether a
// language model can quote the page, everything else is what a crawler can read. The print report
// deliberately does not call this -- it keeps one combined section, because nothing may be hidden
// behind a tab on paper.
export function splitVisibility(fixes: FlowFix[]): { seo: FlowFix[]; ai: FlowFix[] } {
  const visibility = splitFixes(fixes).visibility
  return {
    seo: visibility.filter((fix) => fix.category !== AI_FIX_CATEGORY),
    ai: visibility.filter((fix) => fix.category === AI_FIX_CATEGORY)
  }
}

// The four measured columns, gathered for MeasuredReadout. Here for the same reason splitFixes is:
// three surfaces render the readout, and picking the columns at each of them is three chances to
// forget one -- which shows up as a section quietly missing rows rather than as an error.
export function readoutFor(
  analysis: Pick<Analysis, 'structure' | 'seo' | 'performance' | 'competitorStructures'>
): ReadoutInput {
  return {
    structure: analysis.structure,
    seo: analysis.seo,
    performance: analysis.performance,
    competitors: analysis.competitorStructures
  }
}

// Free plans see only their most recent analyses. Both the dashboard and GET /api/analyses read
// through here so the history cap can never drift between the page and the route that feeds it.
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
