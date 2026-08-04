import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { hypotheses, variants } from '@/db/schema'
import { CORS_HEADERS, preflight } from '@/lib/cors'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { screenshotVariant } from '@/lib/scrape'

export const runtime = 'nodejs'

const BodySchema = z.object({
  embedKey: z.string().uuid(),
  hypothesisId: z.string().uuid()
})

export function OPTIONS() {
  return preflight()
}

function json(url: string | null) {
  return NextResponse.json({ url }, { headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json(null)

  // The embed key is printed in plaintext on the customer's own page, so anyone can read it and
  // start launching browsers here. This is the only thing standing between that and the bill.
  const limited = await enforceRateLimit(
    'screenshot',
    `${parsed.data.embedKey}:${clientIp(request)}`,
    CORS_HEADERS
  )
  if (limited) return limited

  try {
    const hypothesis = await db.query.hypotheses.findFirst({
      where: eq(hypotheses.id, parsed.data.hypothesisId),
      with: {
        analysis: { columns: { url: true, embedKey: true } },
        variants: { orderBy: (v, { asc }) => asc(v.position), limit: 1 }
      }
    })

    // Authorize purely by matching the opaque embed key -- never leak existence otherwise.
    if (!hypothesis || hypothesis.analysis.embedKey !== parsed.data.embedKey) return json(null)

    const variant = hypothesis.variants[0]
    if (!variant) return json(null)
    if (variant.screenshotUrl) return json(variant.screenshotUrl)
    // Only auto-targetable hypotheses can be shown "applied"; manual ones degrade to copy-only.
    if (hypothesis.target !== 'auto' || !hypothesis.selector) return json(null)
    if (process.env.E2E_FIXTURES === '1') return json(null)

    const buffer = await screenshotVariant(
      hypothesis.analysis.url,
      hypothesis.selector,
      variant.copy,
      hypothesis.currentCopy
    )
    // The blob is world-readable, so the path must not be derivable from the variant id -- that id
    // is returned by the authenticated API and would otherwise make every screenshot guessable.
    const { url } = await put(`screenshots/${variant.id}.png`, buffer, {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: true
    })

    await db.update(variants).set({ screenshotUrl: url }).where(eq(variants.id, variant.id))
    return json(url)
  } catch (error) {
    // Fail-safe: the report must never break. Log so misconfigurations (e.g. a private Blob
    // store, a bad selector, an unreachable page) are diagnosable instead of silently empty.
    console.error('[report/screenshot] generation failed', error)
    return json(null)
  }
}
