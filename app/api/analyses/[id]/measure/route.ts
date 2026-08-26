import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, pageSnapshots } from '@/db/schema'
import { snapshotValues } from '@/lib/snapshots'
import { getCurrentUser } from '@/lib/current-user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { isUuid } from '@/lib/uuid'
import { measurePage } from '@/lib/analyze'
import { ScrapeError } from '@/lib/scrape'
import { UnsafeUrlError } from '@/lib/url-guard'

export const runtime = 'nodejs'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('measure', user.id)
  if (limited) return limited

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const analysis = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, user.id)),
    // `market` is pinned at creation and read here only so the frozen snapshot score is computed on
    // the same footing as every other one. A re-measure never re-detects it -- see docs/invariants.md.
    columns: { id: true, url: true, market: true }
  })

  if (!analysis) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let measurement: Awaited<ReturnType<typeof measurePage>>
  try {
    measurement = await measurePage(analysis.url)
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return NextResponse.json({ error: 'invalid_url' }, { status: 422 })
    }
    if (error instanceof ScrapeError) {
      return NextResponse.json({ error: 'scrape_failed' }, { status: 502 })
    }
    console.error('[api/analyses/measure] measurement failed', error)
    return NextResponse.json({ error: 'measure_failed' }, { status: 500 })
  }

  // The columns are the current measurement and the snapshot is the history, written together so a
  // trend can never disagree with what the readout above it shows.
  await db.transaction(async (tx) => {
    await tx
      .update(analyses)
      .set({
        structure: measurement.structure,
        seo: measurement.seo,
        performance: measurement.performance,
        crawlerAccess: measurement.crawlerAccess,
        keywords: measurement.keywords,
        mobile: measurement.mobile
      })
      .where(eq(analyses.id, analysis.id))

    await tx
      .insert(pageSnapshots)
      .values(snapshotValues(analysis.id, measurement, analysis.market))
  })

  return NextResponse.json({ measured: true })
}
