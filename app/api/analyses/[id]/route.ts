import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params

  const analysis = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, user.id)),
    with: { hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.id) } } } }
  })

  if (!analysis) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ analysis })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params

  const [deleted] = await db
    .delete(analyses)
    .where(and(eq(analyses.id, id), eq(analyses.userId, user.id)))
    .returning({ id: analyses.id })

  if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
