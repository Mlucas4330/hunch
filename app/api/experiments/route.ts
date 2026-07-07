import { NextResponse } from 'next/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, experiments, experimentStats, hypotheses, variants } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasReachedFreeExperimentLimit } from '@/lib/usage'
import { experimentWithResult } from '@/lib/experiments'
import { DEFAULT_EXPERIMENT_DURATION } from '@/lib/constants'

const DAY_MS = 86_400_000

const BodySchema = z.object({
  hypothesisId: z.string().uuid(),
  variantId: z.string().uuid(),
  goalSelector: z.string().optional(),
  splitPercent: z.number().int().min(1).max(99).optional(),
  variantCopy: z.string().trim().min(1).max(1000).optional(),
  durationDays: z
    .union([z.literal(7), z.literal(14), z.literal(30)])
    .optional()
    .default(DEFAULT_EXPERIMENT_DURATION)
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 422 })

  const [target] = await db
    .select({
      analysisId: analyses.id,
      embedKey: analyses.embedKey,
      currentCopy: hypotheses.currentCopy,
      selector: hypotheses.selector,
      variantCopy: variants.copy
    })
    .from(hypotheses)
    .innerJoin(analyses, eq(hypotheses.analysisId, analyses.id))
    .innerJoin(variants, eq(variants.hypothesisId, hypotheses.id))
    .where(
      and(
        eq(hypotheses.id, parsed.data.hypothesisId),
        eq(variants.id, parsed.data.variantId),
        eq(analyses.userId, user.id)
      )
    )

  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const running = await db
    .select({ id: experiments.id })
    .from(experiments)
    .innerJoin(analyses, eq(experiments.analysisId, analyses.id))
    .where(and(eq(analyses.userId, user.id), eq(experiments.status, 'running')))

  if (hasReachedFreeExperimentLimit(user, running.length)) {
    return NextResponse.json({ error: 'limit_reached' }, { status: 403 })
  }

  const experiment = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(experiments)
      .values({
        analysisId: target.analysisId,
        hypothesisId: parsed.data.hypothesisId,
        variantId: parsed.data.variantId,
        selector: target.selector,
        controlCopy: target.currentCopy,
        variantCopy: parsed.data.variantCopy ?? target.variantCopy,
        goalSelector: parsed.data.goalSelector ?? null,
        splitPercent: parsed.data.splitPercent ?? 50,
        durationDays: parsed.data.durationDays,
        endsAt: new Date(Date.now() + parsed.data.durationDays * DAY_MS)
      })
      .returning()

    await tx.insert(experimentStats).values([
      { experimentId: created.id, arm: 'control' },
      { experimentId: created.id, arm: 'variant' }
    ])

    await tx.update(variants).set({ status: 'testing' }).where(eq(variants.id, parsed.data.variantId))
    await tx
      .update(hypotheses)
      .set({ status: 'testing' })
      .where(eq(hypotheses.id, parsed.data.hypothesisId))

    return created
  })

  return NextResponse.json(
    { experiment: experimentWithResult(experiment, []), embedKey: target.embedKey },
    { status: 201 }
  )
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const analysisId = new URL(request.url).searchParams.get('analysisId')

  const conditions = [eq(analyses.userId, user.id)]
  if (analysisId) conditions.push(eq(experiments.analysisId, analysisId))

  const rows = await db
    .select({ experiment: experiments, section: hypotheses.section, problem: hypotheses.problem })
    .from(experiments)
    .innerJoin(analyses, eq(experiments.analysisId, analyses.id))
    .innerJoin(hypotheses, eq(experiments.hypothesisId, hypotheses.id))
    .where(and(...conditions))
    .orderBy(desc(experiments.createdAt))

  const ids = rows.map((r) => r.experiment.id)
  const stats = ids.length
    ? await db.select().from(experimentStats).where(inArray(experimentStats.experimentId, ids))
    : []

  const results = rows.map(({ experiment, section, problem }) => ({
    ...experimentWithResult(
      experiment,
      stats.filter((s) => s.experimentId === experiment.id)
    ),
    section,
    problem
  }))

  return NextResponse.json({ experiments: results })
}
