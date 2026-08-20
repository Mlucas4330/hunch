import { NextResponse } from 'next/server'
import { analysisPulse, publicLeaderboard } from '@/lib/analyses'
import { PULSE_CACHE_SECONDS } from '@/lib/constants'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * What the landing page polls: the ranked board and the live feed.
 *
 * Public and unauthenticated, because the page it feeds is. Two things hold that safe, and both are
 * upstream of here: the queries in lib/analyses.ts return a hostname and a score and nothing else --
 * no embed key, no path, no owner -- and this route never widens what they hand back.
 *
 * **Fails open**, the default. A poll costs one cached read and opens no browser, so a Redis outage
 * here is a landing page without ambience, not an unmetered bill -- which is the only thing that
 * earns `failClosed`. See docs/invariants.md. It borrows the `job_status` budget for the same reason
 * that kind exists: cheap polling must not spend an allowance sized for work.
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit('job_status', `pulse:${clientIp(request)}`)
  if (limited) return limited

  try {
    const [leaderboard, pulse] = await Promise.all([publicLeaderboard(), analysisPulse()])

    return NextResponse.json(
      { leaderboard, pulse },
      { headers: { 'Cache-Control': `public, max-age=${PULSE_CACHE_SECONDS}` } }
    )
  } catch (error) {
    console.error('[pulse] read failed', error)
    return NextResponse.json({ leaderboard: [], pulse: [] })
  }
}
