import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, bulkBatchItems, bulkBatches } from '@/db/schema'
import { canBulkGenerate } from '@/lib/auth-policy'
import { parseBulkUrls } from '@/lib/bulk'
import { BULK_URLS_MAX } from '@/lib/constants'
import { getCurrentUser } from '@/lib/current-user'
import { getLocale } from '@/lib/i18n'
import { detectMarket } from '@/lib/market'
import { registerRunner } from '@/lib/queue'
import { quotaFor, quotaLeft } from '@/lib/quota'
import { ANALYSIS_JOB_KIND, runAnalysis, startRun } from '@/lib/run-analysis'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assertPublicUrl, UnsafeUrlError } from '@/lib/url-guard'

registerRunner(ANALYSIS_JOB_KIND, runAnalysis)

const BodySchema = z.object({ urls: z.string() })

/**
 * A list of URLs, queued as one batch.
 *
 * **The tier is re-checked here.** The nav hides the entry and the page answers `notFound()`, and
 * neither is a boundary: this route is a public POST endpoint like any other. See
 * docs/invariants.md.
 *
 * **One bad URL refuses the whole batch**, before anything is inserted. A partially accepted batch
 * leaves the caller to work out which lines took and which did not, having already been charged for
 * the ones that did.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('bulk', user.id)
  if (limited) return limited

  if (!canBulkGenerate(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = BodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'invalid_urls' }, { status: 422 })

  const parsed = parseBulkUrls(body.data.urls)
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.reason === 'too_many' ? 'too_many_urls' : 'invalid_urls', max: BULK_URLS_MAX },
      { status: 422 }
    )
  }

  // Every URL, before a browser is pointed at any of them. See docs/security.md.
  try {
    for (const url of parsed.urls) await assertPublicUrl(url)
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return NextResponse.json({ error: 'invalid_url' }, { status: 422 })
    }
    throw error
  }

  // The friendly refusal. What actually keeps a batch from overdrawing the account is the atomic
  // charge inside `startRun`, which is why the loop below stops the moment one cannot be paid for.
  if (quotaLeft(await quotaFor(user.id)) < parsed.urls.length) {
    return NextResponse.json({ error: 'quota_exhausted' }, { status: 403 })
  }

  const locale = await getLocale()

  const [batch] = await db
    .insert(bulkBatches)
    .values({ userId: user.id })
    .returning({ id: bulkBatches.id })

  let started = 0

  for (const url of parsed.urls) {
    const [created] = await db
      .insert(analyses)
      .values({ userId: user.id, url, locale, market: detectMarket({ url, lang: null }) })
      .returning({ id: analyses.id })

    const run = await startRun(created.id, user.id)

    // No queue, or nothing left to pay with. The analysis goes with the run that was refused, and
    // the batch keeps what already started rather than unwinding work now in flight.
    if (!run) {
      await db.delete(analyses).where(eq(analyses.id, created.id))
      break
    }

    await db.insert(bulkBatchItems).values({ batchId: batch.id, analysisId: created.id, url })
    started += 1
  }

  if (started === 0) {
    await db.delete(bulkBatches).where(eq(bulkBatches.id, batch.id))
    return NextResponse.json({ error: 'queue_unavailable' }, { status: 503 })
  }

  return NextResponse.json(
    { batchId: batch.id, started, requested: parsed.urls.length },
    { status: 202 }
  )
}
