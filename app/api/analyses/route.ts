import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { listAnalysesForUser, parsePaging } from '@/lib/analyses'
import { registerRunner } from '@/lib/queue'
import { quotaFor, quotaLeft } from '@/lib/quota'
import { ANALYSIS_JOB_KIND, analysisProgress, runAnalysis, startRun } from '@/lib/run-analysis'
import { detectMarket } from '@/lib/market'
import { getLocale } from '@/lib/i18n'
import { assertPublicUrl, UnsafeUrlError } from '@/lib/url-guard'

registerRunner(ANALYSIS_JOB_KIND, runAnalysis)

const BodySchema = z.object({
  url: z.string().url(),
  // Optional, and supplied by hand. Nothing in the product infers a competitor.
  competitorUrl: z.string().url().optional()
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('analysis', user.id)
  if (limited) return limited

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_url' }, { status: 422 })

  // Both URLs, because both are pointed at a real browser. See docs/security.md.
  try {
    await assertPublicUrl(parsed.data.url)
    if (parsed.data.competitorUrl) await assertPublicUrl(parsed.data.competitorUrl)
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return NextResponse.json({ error: 'invalid_url' }, { status: 422 })
    }
    throw error
  }

  // Read from the rows, never from the session. See docs/invariants.md.
  if (quotaLeft(await quotaFor(user.id)) === 0) {
    return NextResponse.json({ error: 'quota_exhausted' }, { status: 403 })
  }

  const locale = await getLocale()

  try {
    // The row is created before the work so the caller gets an embed key it can navigate to and poll
    // immediately, rather than holding a connection for the length of a scrape.
    const [created] = await db
      .insert(analyses)
      .values({
        userId: user.id,
        url: parsed.data.url,
        competitorUrl: parsed.data.competitorUrl ?? null,
        locale,
        market: detectMarket({ url: parsed.data.url, lang: null })
      })
      .returning({ id: analyses.id, embedKey: analyses.embedKey })

    // Without Redis there is no queue: `startRun` removes the run, and the analysis goes with it.
    const started = await startRun(created.id, user.id)
    if (!started) {
      await db.delete(analyses).where(eq(analyses.id, created.id))
      return NextResponse.json({ error: 'queue_unavailable' }, { status: 503 })
    }

    return NextResponse.json({ embedKey: created.embedKey, id: created.id }, { status: 202 })
  } catch (error) {
    console.error('[api/analyses] could not start', error)
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const embedKey = searchParams.get('embedKey')

  // Progress is readable by whoever holds the key, because the report is shared by link. It answers
  // booleans and a state, and no content.
  if (embedKey) {
    const progress = z.string().uuid().safeParse(embedKey).success
      ? await analysisProgress(embedKey)
      : null

    return progress
      ? NextResponse.json(progress)
      : NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { rows, total, page, pages } = await listAnalysesForUser(user, {
    page: parsePaging(searchParams.get('page')),
    limit: parsePaging(searchParams.get('limit'))
  })

  return NextResponse.json({ analyses: rows, total, page, pages })
}
