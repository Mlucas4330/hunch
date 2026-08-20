import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { hypotheses, variants } from '@/db/schema'
import { CORS_HEADERS, preflight } from '@/lib/cors'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { enqueue, jobId, jobRef, readJob, registerRunner, type RunOutcome } from '@/lib/queue'
import { screenshotVariant } from '@/lib/scrape'
import { saveScreenshot } from '@/lib/screenshots'
import type { JobStatus } from '@/lib/enums'

export const runtime = 'nodejs'

const KIND = 'screenshot'

const BodySchema = z.object({
  embedKey: z.string().uuid(),
  hypothesisId: z.string().uuid()
})

export function OPTIONS() {
  return preflight()
}

type Shot = { url: string; overflow: boolean }

function json(status: JobStatus, result?: Shot) {
  return NextResponse.json(
    { status, url: result?.url ?? null, overflow: result?.overflow ?? false },
    { headers: CORS_HEADERS }
  )
}

// Rendering happens here, off the request that asked for it. Reporting `ok: false` is how this says
// the work can never succeed for this variant -- a manual hypothesis, a selector that no longer
// matches, an unwritable volume -- which the queue turns into `unavailable` rather than a retry.
async function renderVariant(id: string): Promise<RunOutcome<Shot>> {
  const variantId = jobRef(id)

  const variant = await db.query.variants.findFirst({
    where: eq(variants.id, variantId),
    with: { hypothesis: { with: { analysis: { columns: { url: true } } } } }
  })

  if (!variant) return { ok: false }

  const { hypothesis } = variant
  if (hypothesis.target !== 'auto' || !hypothesis.selector) return { ok: false }

  const { buffer, overflow } = await screenshotVariant(
    hypothesis.analysis.url,
    hypothesis.selector,
    variant.copy,
    hypothesis.currentCopy,
    variant.emphasis
  )

  const url = await saveScreenshot(variant.id, buffer)

  await db
    .update(variants)
    .set({ screenshotUrl: url, screenshotOverflow: overflow })
    .where(eq(variants.id, variant.id))

  return { ok: true, result: { url, overflow } }
}

registerRunner(KIND, renderVariant)

// Resolves the variant behind an (embedKey, hypothesisId) pair, refusing anything the caller does
// not hold the key for. Returns the cached render when there already is one.
async function resolve(embedKey: string, hypothesisId: string) {
  const hypothesis = await db.query.hypotheses.findFirst({
    where: eq(hypotheses.id, hypothesisId),
    with: {
      analysis: { columns: { embedKey: true } },
      variants: { orderBy: (v, { asc }) => asc(v.position), limit: 1 }
    }
  })

  if (!hypothesis || hypothesis.analysis.embedKey !== embedKey) return null
  return hypothesis.variants[0] ?? null
}

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json('unavailable')

  const limited = await enforceRateLimit(
    'screenshot',
    `${parsed.data.embedKey}:${clientIp(request)}`,
    CORS_HEADERS
  )
  if (limited) return limited

  try {
    const variant = await resolve(parsed.data.embedKey, parsed.data.hypothesisId)
    if (!variant) return json('unavailable')

    if (variant.screenshotUrl) {
      return json('ready', { url: variant.screenshotUrl, overflow: variant.screenshotOverflow })
    }
    if (process.env.E2E_FIXTURES === '1') return json('unavailable')

    const id = jobId(KIND, variant.id)
    const job = await enqueue(id)

    // **Redis down falls back to rendering inline**, the way this route always worked. That keeps
    // local dev without REDIS_URL working and keeps a Redis outage from taking previews out
    // entirely. It is the opposite call from the anonymous analysis route, and deliberately so: a
    // preview costs one browser slot for someone who already holds a valid embed key, while an
    // unmetered public analysis is a bill. See docs/invariants.md.
    if (!job) {
      const outcome = await renderVariant(id)
      return outcome.ok && outcome.result ? json('ready', outcome.result) : json('unavailable')
    }

    return job.status === 'ready' && job.result
      ? json('ready', job.result as Shot)
      : json(job.status)
  } catch (error) {
    console.error('[report/screenshot] enqueue failed', error)
    return json('unavailable')
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const embedKey = searchParams.get('embedKey') ?? ''
  const hypothesisId = searchParams.get('hypothesisId') ?? ''

  const parsed = BodySchema.safeParse({ embedKey, hypothesisId })
  if (!parsed.success) return json('unavailable')

  const limited = await enforceRateLimit(
    'job_status',
    `${parsed.data.embedKey}:${clientIp(request)}`,
    CORS_HEADERS
  )
  if (limited) return limited

  try {
    const variant = await resolve(parsed.data.embedKey, parsed.data.hypothesisId)
    if (!variant) return json('unavailable')

    // Postgres is the durable answer and Redis is only the in-flight one, so the row wins: a job
    // whose TTL lapsed after the render succeeded must still read as ready.
    if (variant.screenshotUrl) {
      return json('ready', { url: variant.screenshotUrl, overflow: variant.screenshotOverflow })
    }

    const job = await readJob<Shot>(jobId(KIND, variant.id))
    if (!job) return json('unavailable')

    return job.status === 'ready' && job.result ? json('ready', job.result) : json(job.status)
  } catch (error) {
    console.error('[report/screenshot] status failed', error)
    return json('unavailable')
  }
}
