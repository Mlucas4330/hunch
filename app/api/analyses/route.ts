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
    //
    // **It is created ownerless whoever is signed in**, because the ledger row `spendCredit` writes
    // names the analysis it paid for and cannot do that before one exists. Ownership is granted below,
    // and only if a credit was actually taken.
    const [created] = await db
      .insert(analyses)
      .values({
        userId: null,
        url: parsed.data.url,
        brief: brief ?? null,
        locale,
        market: detectMarket({ url: parsed.data.url, lang: null })
      })
      .returning({ id: analyses.id, embedKey: analyses.embedKey })

    // **Spent before the work, refunded if the work fails.** The other order -- generate, then charge
    // -- means a crash between the two hands out a free analysis, and there is no way to tell
    // afterwards which of the two happened. Nothing has been queued yet, so this is still before.
    //
    // **An empty balance is no longer a refusal.** It used to delete the row and answer 402, which
    // made signing in strictly worse than being signed out: a visitor with no session got the free
    // readout and the same person signed in got nothing. Now the run simply stays ownerless, which is
    // the existing free half rather than a new mode -- `runAnalysis` measures and calls no model, and
    // the report renders the readout with the unlock wall where the fixes would be. See
    // docs/invariants.md.
    const paid = user ? (await spendCredit(user.id, created.id)).spent : false

    // Ownership is the whole record of having paid, so it is written only once a credit is gone --
    // and before the job is queued, since `runAnalysis` reads this column to decide what to run.
    if (paid) {
      await db.update(analyses).set({ userId: user!.id }).where(eq(analyses.id, created.id))
    }

    const job = await enqueue(jobId(ANALYSIS_JOB_KIND, created.id))

    // Unlike the preview, there is no inline fallback here: without Redis there is no queue, and
    // running a scrape inside the request is exactly the unmetered path the fail-closed limit above
    // exists to prevent.
    if (!job || job.status === 'unavailable') {
      if (paid) await refundCredit(user!.id, created.id)
      await db.delete(analyses).where(eq(analyses.id, created.id))
      return NextResponse.json({ error: 'queue_unavailable' }, { status: 503 })
    }

    return NextResponse.json(
      { embedKey: created.embedKey, id: created.id, owned: paid },
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
