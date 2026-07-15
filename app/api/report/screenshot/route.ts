import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { hypotheses, variants } from '@/db/schema'
import { CORS_HEADERS, preflight } from '@/lib/cors'
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
    const { url } = await put(`screenshots/${variant.id}.png`, buffer, {
      access: 'public',
      contentType: 'image/png'
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
