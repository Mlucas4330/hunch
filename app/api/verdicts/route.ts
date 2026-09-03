import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, flowFixes, hypotheses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { VERDICT, VERDICT_TARGET } from '@/lib/enums'
import { isUuid } from '@/lib/uuid'

export const runtime = 'nodejs'

/**
 * The owner's verdict on one recommendation.
 *
 * **One route for both tables, against the precedent of `/api/hypotheses/[id]/variants`.** That route
 * is path-shaped because what it does is specific to a hypothesis. This does one UPDATE of one column
 * and the only thing it has to get right is that the row belongs to the caller -- written twice, in
 * two files, that check is the thing that drifts. `TABLES` keeps the two shapes side by side where a
 * reader can see they are the same.
 *
 * A verdict is a fact about what the owner decided and never about what the change produced. See
 * docs/invariants.md.
 */
const BodySchema = z.object({
  target: z.enum(VERDICT_TARGET),
  id: z.string().refine(isUuid),
  // Null is a real value here: it takes a decision back, which is not the same as deciding against.
  verdict: z.enum(VERDICT).nullable()
})

const TABLES = {
  hypothesis: hypotheses,
  fix: flowFixes
} as const

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('verdict', user.id)
  if (limited) return limited

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 422 })

  const { target, id, verdict } = parsed.data
  const table = TABLES[target]

  // **404 rather than 403 for a row somebody else owns**, exactly as the measure route answers: the
  // caller learns nothing about whether the id exists.
  //
  // A join rather than `db.query`, because the relational builder is typed per table and the two
  // branches would not share one call. Both tables carry `analysisId`, so the join is the same shape
  // for either.
  const [row] = await db
    .select({ userId: analyses.userId })
    .from(table)
    .innerJoin(analyses, eq(analyses.id, table.analysisId))
    .where(eq(table.id, id))
    .limit(1)

  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  await db
    .update(table)
    .set({ verdict, verdictAt: verdict ? new Date() : null })
    .where(eq(table.id, id))

  return NextResponse.json({ verdict })
}
