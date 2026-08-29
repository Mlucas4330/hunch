import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { isUuid } from '@/lib/uuid'
import { generateAdIdeas } from '@/lib/analyze'

export const runtime = 'nodejs'

/**
 * Ad groups written off the terms this code counted on the page.
 *
 * **Owner only, and it spends no credit.** The analysis was already paid for; charging again here
 * would put a second source of truth beside the ledger about what a purchase entitles someone to,
 * which is exactly the shape docs/invariants.md exists to prevent. What bounds the cost instead is
 * the rate limit, the fact that only the owner can reach it, and the column: once written, the
 * answer is read back rather than generated again.
 *
 * **It refuses a page with no measured terms rather than generating from nothing.** The whole claim
 * the section makes is that these words came off the reader's own page -- with no terms there is
 * nothing to ground it in, and a model asked anyway would invent the keywords a keyword tool would
 * have sold them. See docs/invariants.md.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('ad_ideas', user.id)
  if (limited) return limited

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const analysis = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, user.id)),
    columns: {
      id: true,
      adIdeas: true,
      keywords: true,
      seo: true,
      structure: true,
      brief: true,
      locale: true,
      market: true
    }
  })

  if (!analysis) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Written once. A second press is a press on a button the page should no longer be showing, so it
  // costs a query and no tokens rather than a second opinion the reader never asked for.
  if (analysis.adIdeas) return NextResponse.json({ adIdeas: analysis.adIdeas })

  if (!analysis.keywords?.terms.length || !analysis.seo || !analysis.structure) {
    return NextResponse.json({ error: 'nothing_measured' }, { status: 422 })
  }

  const adIdeas = await generateAdIdeas({
    keywords: analysis.keywords,
    seo: analysis.seo,
    structure: analysis.structure,
    founderBrief: analysis.brief,
    // The locale the analysis ran in, never the reader's current one: generated content is pinned to
    // the language it was written in. See docs/invariants.md.
    locale: analysis.locale,
    market: analysis.market
  })

  if (!adIdeas) {
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }

  await db.update(analyses).set({ adIdeas }).where(eq(analyses.id, analysis.id))

  return NextResponse.json({ adIdeas })
}
