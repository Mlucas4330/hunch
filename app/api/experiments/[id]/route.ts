import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, experiments, experimentStats, hypotheses, variants } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { experimentWithResult } from '@/lib/experiments'
import { EXPERIMENT_ACTION } from '@/lib/enums'

const BodySchema = z.object({
  action: z.enum(EXPERIMENT_ACTION)
})

async function ownedExperiment(id: string, userId: string) {
  const [row] = await db
    .select({ experiment: experiments })
    .from(experiments)
    .innerJoin(analyses, eq(experiments.analysisId, analyses.id))
    .where(and(eq(experiments.id, id), eq(analyses.userId, userId)))

  return row?.experiment ?? null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const experiment = await ownedExperiment(id, user.id)
  if (!experiment) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const stats = await db
    .select()
    .from(experimentStats)
    .where(eq(experimentStats.experimentId, id))

  return NextResponse.json({ experiment: experimentWithResult(experiment, stats) })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_action' }, { status: 422 })

  const experiment = await ownedExperiment(id, user.id)
  if (!experiment) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const updated = await db.transaction(async (tx) => {
    if (parsed.data.action === 'declare_winner') {
      await tx
        .update(variants)
        .set({ status: 'winner' })
        .where(eq(variants.id, experiment.variantId))
      await tx
        .update(hypotheses)
        .set({ status: 'completed' })
        .where(eq(hypotheses.id, experiment.hypothesisId))
      const [row] = await tx
        .update(experiments)
        .set({ status: 'completed', stoppedAt: new Date() })
        .where(eq(experiments.id, id))
        .returning()
      return row
    }

    if (parsed.data.action === 'discard') {
      await tx
        .update(variants)
        .set({ status: 'rejected' })
        .where(eq(variants.id, experiment.variantId))
    }

    const [row] = await tx
      .update(experiments)
      .set({ status: 'stopped', stoppedAt: new Date() })
      .where(eq(experiments.id, id))
      .returning()
    return row
  })

  const stats = await db
    .select()
    .from(experimentStats)
    .where(eq(experimentStats.experimentId, id))

  return NextResponse.json({ experiment: experimentWithResult(updated, stats) })
}
