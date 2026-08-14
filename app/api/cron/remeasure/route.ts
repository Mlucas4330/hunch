import { NextResponse } from 'next/server'
import { and, desc, eq, lt, ne, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, pageSnapshots, users } from '@/db/schema'
import { authorizeCron } from '@/lib/cron-auth'
import { REMEASURE_BATCH_MAX, REMEASURE_MIN_AGE_MS } from '@/lib/constants'
import { measurePage } from '@/lib/analyze'
import { snapshotValues } from '@/lib/snapshots'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - REMEASURE_MIN_AGE_MS)

  // Paid plans only, and only pages nobody has measured recently. This job opens a real browser
  // against a customer's own site, so the batch is a cost ceiling rather than a page size.
  const due = await db
    .select({ id: analyses.id, url: analyses.url })
    .from(analyses)
    .innerJoin(users, eq(users.id, analyses.userId))
    .where(
      and(
        ne(users.plan, 'free'),
        lt(
          sql`coalesce((select max(${pageSnapshots.capturedAt}) from ${pageSnapshots} where ${pageSnapshots.analysisId} = ${analyses.id}), ${analyses.createdAt})`,
          cutoff
        )
      )
    )
    .orderBy(desc(analyses.createdAt))
    .limit(REMEASURE_BATCH_MAX)

  let measured = 0

  // Serial on purpose: withBrowserSlot already caps concurrency, and a cron that saturates the pool
  // would make every interactive analysis wait behind it.
  for (const analysis of due) {
    try {
      const measurement = await measurePage(analysis.url)

      await db.transaction(async (tx) => {
        await tx
          .update(analyses)
          .set({
            structure: measurement.structure,
            seo: measurement.seo,
            performance: measurement.performance,
            crawlerAccess: measurement.crawlerAccess,
            keywords: measurement.keywords
          })
          .where(eq(analyses.id, analysis.id))

        await tx.insert(pageSnapshots).values(snapshotValues(analysis.id, measurement))
      })

      measured += 1
    } catch (error) {
      // One unreachable page never costs the rest of the batch.
      console.error('[cron/remeasure] measurement failed', { id: analysis.id, error })
    }
  }

  return NextResponse.json({ due: due.length, measured })
}
