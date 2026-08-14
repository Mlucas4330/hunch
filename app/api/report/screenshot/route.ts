import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { hypotheses, variants } from '@/db/schema'
import { CORS_HEADERS, preflight } from '@/lib/cors'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { screenshotVariant } from '@/lib/scrape'
import { saveScreenshot } from '@/lib/screenshots'

export const runtime = 'nodejs'

const BodySchema = z.object({
  embedKey: z.string().uuid(),
  hypothesisId: z.string().uuid()
})

export function OPTIONS() {
  return preflight()
}

function json(url: string | null, overflow = false) {
  return NextResponse.json({ url, overflow }, { headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json(null)

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

    if (!hypothesis || hypothesis.analysis.embedKey !== parsed.data.embedKey) return json(null)

    const variant = hypothesis.variants[0]
    if (!variant) return json(null)
    if (variant.screenshotUrl) return json(variant.screenshotUrl, variant.screenshotOverflow)
    if (hypothesis.target !== 'auto' || !hypothesis.selector) return json(null)
    if (process.env.E2E_FIXTURES === '1') return json(null)

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
    return json(url, overflow)
  } catch (error) {
    console.error('[report/screenshot] generation failed', error)
    return json(null)
  }
}
