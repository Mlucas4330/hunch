import { NextResponse } from 'next/server'
import { and, eq, inArray, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { experiments, hypotheses } from '@/db/schema'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const due = await db.transaction(async (tx) => {
    const finalized = await tx
      .update(experiments)
      .set({ status: 'completed', stoppedAt: new Date() })
      .where(and(eq(experiments.status, 'running'), lte(experiments.endsAt, sql`now()`)))
      .returning({ hypothesisId: experiments.hypothesisId })

    if (finalized.length > 0) {
      await tx
        .update(hypotheses)
        .set({ status: 'completed' })
        .where(
          inArray(
            hypotheses.id,
            finalized.map((row) => row.hypothesisId)
          )
        )
    }

    return finalized
  })

  return NextResponse.json({ finalized: due.length })
}
