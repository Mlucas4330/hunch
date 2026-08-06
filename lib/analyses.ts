import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, type Analysis, type FlowFix, type User } from '@/db/schema'
import { FREE_ANALYSES_LIMIT } from '@/lib/constants'
import type { FixKind } from '@/lib/enums'

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
