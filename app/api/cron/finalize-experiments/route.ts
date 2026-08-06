import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { experiments, experimentStats, hypotheses, variants } from '@/db/schema'
import { authorizeCron } from '@/lib/cron-auth'
import { experimentIsOver, experimentWithResult } from '@/lib/experiments'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const due = await db.transaction(async (tx) => {
    const finalized = await tx
      .update(experiments)
      .set({ status: 'completed', stoppedAt: new Date() })
      .where(and(eq(experiments.status, 'running'), experimentIsOver()))
      .returning()

    if (finalized.length === 0) return finalized

    await tx
      .update(hypotheses)
      .set({ status: 'completed' })
      .where(
        inArray(
          hypotheses.id,
          finalized.map((row) => row.hypothesisId)
        )
      )

    // Finishing on its own is the normal way a test ends, so this is where most variants get their
    // verdict. Leaving them in `testing` would mean the status only ever resolves for the minority
    // of tests someone closed by hand.
    const stats = await tx
      .select()
      .from(experimentStats)
      .where(
        inArray(
          experimentStats.experimentId,
          finalized.map((row) => row.id)
        )
      )

    for (const experiment of finalized) {
      const { result } = experimentWithResult(
        experiment,
        stats.filter((s) => s.experimentId === experiment.id)
      )
      await tx
        .update(variants)
        .set({ status: result.recommendation === 'ship_variant' ? 'winner' : 'rejected' })
        .where(eq(variants.id, experiment.variantId))
    }

    return finalized
  })

  return NextResponse.json({ finalized: due.length })
}
