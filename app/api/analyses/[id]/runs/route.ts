import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { isUuid } from '@/lib/uuid'
import { registerRunner } from '@/lib/queue'
import { quotaFor, quotaLeft } from '@/lib/quota'
import { ANALYSIS_JOB_KIND, runAnalysis, runInFlight, startRun } from '@/lib/run-analysis'

export const runtime = 'nodejs'

registerRunner(ANALYSIS_JOB_KIND, runAnalysis)

/**
 * "Run again": measures the page and rewrites the error lists on the same report, spending one run of
 * the month. See docs/api.md.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('analysis', user.id)
  if (limited) return limited

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const analysis = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, user.id)),
    columns: { id: true }
  })

  if (!analysis) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (await runInFlight(analysis.id)) {
    return NextResponse.json({ error: 'run_in_progress' }, { status: 409 })
  }

  // Read from the rows, never from the session. See docs/invariants.md.
  if (quotaLeft(await quotaFor(user.id)) === 0) {
    return NextResponse.json({ error: 'quota_exhausted' }, { status: 403 })
  }

  const started = await startRun(analysis.id, user.id)
  if (!started) return NextResponse.json({ error: 'queue_unavailable' }, { status: 503 })

  return NextResponse.json({ runId: started.runId }, { status: 202 })
}
