import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, hypotheses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { isUuid } from '@/lib/uuid'
import { HYPOTHESIS_STATUS } from '@/lib/enums'

const BodySchema = z.object({
  status: z.enum(HYPOTHESIS_STATUS)
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_status' }, { status: 422 })

  const existing = await db
    .select({ id: hypotheses.id })
    .from(hypotheses)
    .innerJoin(analyses, eq(hypotheses.analysisId, analyses.id))
    .where(and(eq(hypotheses.id, id), eq(analyses.userId, user.id)))

  if (existing.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const [updated] = await db
    .update(hypotheses)
    .set({ status: parsed.data.status })
    .where(eq(hypotheses.id, id))
    .returning()

  return NextResponse.json({ hypothesis: updated })
}
