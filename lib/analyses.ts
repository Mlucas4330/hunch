import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, type Analysis, type User } from '@/db/schema'
import { FREE_ANALYSES_LIMIT } from '@/lib/constants'

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 10

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
