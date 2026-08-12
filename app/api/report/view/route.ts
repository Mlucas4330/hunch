import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { reportViews } from '@/db/schema'
import { CORS_HEADERS, preflight } from '@/lib/cors'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const BodySchema = z.object({
  embedKey: z.string().uuid()
})

export function OPTIONS() {
  return preflight()
}

function ok() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ok()

  const limited = await enforceRateLimit(
    'report_view',
    `${parsed.data.embedKey}:${clientIp(request)}`,
    CORS_HEADERS
  )
  if (limited) return limited

  try {
    await db.insert(reportViews).values({ embedKey: parsed.data.embedKey })
  } catch (error) {
    console.error('[report/view] insert failed', error)
  }

  return ok()
}
