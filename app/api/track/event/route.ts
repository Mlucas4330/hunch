import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, experiments, experimentStats } from '@/db/schema'
import { CORS_HEADERS, preflight } from '@/lib/cors'
import { EXPERIMENT_ARM, TRACK_EVENT } from '@/lib/enums'

export const runtime = 'nodejs'

const BodySchema = z.object({
  key: z.string().uuid(),
  experimentId: z.string().uuid(),
  arm: z.enum(EXPERIMENT_ARM),
  type: z.enum(TRACK_EVENT)
})

export function OPTIONS() {
  return preflight()
}

export async function POST(request: Request) {
  const raw = await request.text().catch(() => '')
  const parsed = BodySchema.safeParse(safeJson(raw))

  // Best-effort ingestion: always answer 204 so a bad beacon never surfaces on the host page.
  if (!parsed.success) return noContent()

  const [experiment] = await db
    .select({ id: experiments.id })
    .from(experiments)
    .innerJoin(analyses, eq(experiments.analysisId, analyses.id))
    .where(
      and(
        eq(experiments.id, parsed.data.experimentId),
        eq(analyses.embedKey, parsed.data.key),
        eq(experiments.status, 'running')
      )
    )

  if (!experiment) return noContent()

  const column = parsed.data.type === 'conversion' ? 'conversions' : 'impressions'
  await db
    .update(experimentStats)
    .set(
      column === 'conversions'
        ? { conversions: sql`${experimentStats.conversions} + 1` }
        : { impressions: sql`${experimentStats.impressions} + 1` }
    )
    .where(
      and(
        eq(experimentStats.experimentId, parsed.data.experimentId),
        eq(experimentStats.arm, parsed.data.arm)
      )
    )

  return noContent()
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function noContent() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
