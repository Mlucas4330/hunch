import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, experimentEvents, experiments, experimentStats } from '@/db/schema'
import { CORS_HEADERS, preflight } from '@/lib/cors'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { EXPERIMENT_ARM, TRACK_EVENT } from '@/lib/enums'

export const runtime = 'nodejs'

const BodySchema = z.object({
  key: z.string().uuid(),
  experimentId: z.string().uuid(),
  arm: z.enum(EXPERIMENT_ARM),
  type: z.enum(TRACK_EVENT),
  // Optional so a snippet cached from before this shipped keeps reporting. Those events are
  // counted without dedupe, exactly as they were.
  visitorId: z.string().uuid().optional()
})

export function OPTIONS() {
  return preflight()
}

export async function POST(request: Request) {
  const raw = await request.text().catch(() => '')
  const parsed = BodySchema.safeParse(safeJson(raw))

  // Best-effort ingestion: always answer 204 so a bad beacon never surfaces on the host page.
  if (!parsed.success) return noContent()

  // Per key AND per IP: one visitor's browser is one address, so this caps how fast a single
  // source can inflate an arm without capping the page's genuine traffic.
  const limited = await enforceRateLimit(
    'track_event',
    `${parsed.data.key}:${clientIp(request)}`,
    CORS_HEADERS
  )
  if (limited) return limited

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

  // The unique index is what actually enforces this: a second event from the same visitor for the
  // same arm inserts nothing, so the counter below never runs twice. Without it, anyone holding the
  // public embed key could increment an arm at will and decide the winner.
  if (parsed.data.visitorId) {
    const claimed = await db
      .insert(experimentEvents)
      .values({
        experimentId: parsed.data.experimentId,
        visitorId: parsed.data.visitorId,
        arm: parsed.data.arm,
        type: parsed.data.type
      })
      .onConflictDoNothing()
      .returning({ id: experimentEvents.id })

    if (claimed.length === 0) return noContent()
  }

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
