import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, experiments } from '@/db/schema'
import { CORS_HEADERS, preflight } from '@/lib/cors'
import { enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key')
  // Best-effort: a missing or malformed key returns an empty config, never an error,
  // so a bad snippet install can never break the host page.
  const parsedKey = z.string().uuid().safeParse(key)
  if (!parsedKey.success) {
    return NextResponse.json({ experiments: [] }, { headers: CORS_HEADERS })
  }

  // Keyed on the embed key rather than the IP: this is one landing page's real visitor traffic
  // arriving from many addresses, so a per-IP window would throttle the wrong thing.
  const limited = await enforceRateLimit('track_config', parsedKey.data, CORS_HEADERS)
  if (limited) return limited

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.embedKey, parsedKey.data),
    columns: { id: true }
  })

  if (!analysis) {
    return NextResponse.json({ experiments: [] }, { headers: CORS_HEADERS })
  }

  const rows = await db
    .select({
      experimentId: experiments.id,
      selector: experiments.selector,
      controlCopy: experiments.controlCopy,
      variantCopy: experiments.variantCopy,
      splitPercent: experiments.splitPercent,
      goalSelector: experiments.goalSelector
    })
    .from(experiments)
    .where(and(eq(experiments.analysisId, analysis.id), eq(experiments.status, 'running')))

  return NextResponse.json(
    { experiments: rows },
    { headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=30' } }
  )
}
