import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { refundCredit, spendCredit } from '@/lib/credits'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { listAnalysesForUser, parsePaging } from '@/lib/analyses'
import { enqueue, jobId, registerRunner } from '@/lib/queue'
import { ANALYSIS_JOB_KIND, analysisProgress, runAnalysis } from '@/lib/run-analysis'
import { detectMarket } from '@/lib/market'
import { getLocale } from '@/lib/i18n'
import { assertPublicUrl, UnsafeUrlError } from '@/lib/url-guard'

registerRunner(ANALYSIS_JOB_KIND, runAnalysis)

const BodySchema = z.object({
  url: z.string().url(),
  brief: z.string().trim().max(2000).optional()
})

export async function POST(request: Request) {
  const user = await getCurrentUser()

  // **The anonymous path fails closed, and it is the only route that does.** Failing open is right
  // where the cost of a request is a query; here every accepted call opens a real browser against
  // three shared slots, with no session behind it. A Redis outage that silently removed the limit
  // would be the bill and the outage at once. See docs/invariants.md.
  const limited = user
    ? await enforceRateLimit('analysis', user.id)
    : await enforceRateLimit('analysis', clientIp(request), undefined, { failClosed: true })
  if (limited) return limited

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_url' }, { status: 422 })

  // Checked before anything is written, so a refused URL never leaves a row behind. The scrape
  // re-applies it per request anyway -- see docs/security.md.
  try {
    await assertPublicUrl(parsed.data.url)
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return NextResponse.json({ error: 'invalid_url' }, { status: 422 })
    }
    throw error
  }

  const brief = parsed.data.brief || undefined
  const locale = await getLocale()

  try {
    // The row is created before the work so the caller gets an embed key it can navigate to and poll
    // immediately, rather than holding a connection for the length of a scrape. Its measured columns
    // are null until the job fills them, which is the same state an analysis from before those
    // columns existed is in -- so every surface already knows how to render it.
    const [created] = await db
      .insert(analyses)
      .values({
        userId: user?.id ?? null,
        url: parsed.data.url,
        brief: brief ?? null,
        locale,
        market: detectMarket({ url: parsed.data.url, lang: null })
      })
      .returning({ id: analyses.id, embedKey: analyses.embedKey })

    // **Spent before the work, refunded if the work fails.** The other order — generate, then
    // charge — means a crash between the two hands out a free analysis, and there is no way to tell
    // afterwards which of the two happened.
    if (user) {
      const { spent } = await spendCredit(user.id, created.id)
      if (!spent) {
        await db.delete(analyses).where(eq(analyses.id, created.id))
        return NextResponse.json({ error: 'no_credits' }, { status: 402 })
      }
    }

    const job = await enqueue(jobId(ANALYSIS_JOB_KIND, created.id))

    // Unlike the preview, there is no inline fallback here: without Redis there is no queue, and
    // running a scrape inside the request is exactly the unmetered path the fail-closed limit above
    // exists to prevent.
    if (!job || job.status === 'unavailable') {
      if (user) await refundCredit(user.id, created.id)
      await db.delete(analyses).where(eq(analyses.id, created.id))
      return NextResponse.json({ error: 'queue_unavailable' }, { status: 503 })
    }

    return NextResponse.json(
      { embedKey: created.embedKey, id: created.id, owned: Boolean(user) },
      { status: 202 }
    )
  } catch (error) {
    console.error('[api/analyses] could not start', error)
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const embedKey = searchParams.get('embedKey')

  // Progress is readable by whoever holds the key, because the anonymous caller who started the
  // analysis has nothing else to identify themselves with. It answers three booleans and no content.
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
