import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, flowFixes, hypotheses, users, variants } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { hasReachedFreeLimit, periodExpired } from '@/lib/usage'
import { listAnalysesForUser } from '@/lib/analyses'
import { analyzeLandingPage } from '@/lib/analyze'
import { getLocale } from '@/lib/i18n'
import { ScrapeError } from '@/lib/scrape'
import { UnsafeUrlError } from '@/lib/url-guard'

const BodySchema = z.object({
  url: z.string().url(),
  brief: z.string().trim().max(2000).optional(),
  competitorUrls: z.array(z.string().url()).max(3).optional()
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Distinct from the plan quota below: paid plans are unlimited by the month but still must not
  // be able to run the scraper and the model in a loop.
  const limited = await enforceRateLimit('analysis', user.id)
  if (limited) return limited

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_url' }, { status: 422 })

  if (hasReachedFreeLimit(user)) {
    return NextResponse.json({ error: 'limit_reached' }, { status: 403 })
  }

  const brief = parsed.data.brief || undefined
  // Competitor mode is a paid feature: free users always fall back to auto web-search.
  const competitorUrls = user.plan === 'free' ? undefined : parsed.data.competitorUrls
  // The analysis is written in the language the user is reading the app in.
  const locale = await getLocale()

  let output
  try {
    output = await analyzeLandingPage(parsed.data.url, { brief, competitorUrls, locale })
  } catch (error) {
    // A URL that points inside the deploy is a rejected input, not a failed scrape.
    if (error instanceof UnsafeUrlError) {
      return NextResponse.json({ error: 'invalid_url' }, { status: 422 })
    }
    if (error instanceof ScrapeError) {
      return NextResponse.json({ error: 'scrape_failed' }, { status: 502 })
    }
    // A bare 500 here is undiagnosable: generation failures are the most likely cause and they
    // carry the schema or API detail that explains them.
    console.error('[api/analyses] analysis failed', error)
    return NextResponse.json({ error: 'analysis_failed' }, { status: 500 })
  }

  try {
    const ranked = [...output.hypotheses].sort((a, b) => b.impact_score - a.impact_score)

    const analysis = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(analyses)
        .values({
          userId: user.id,
          url: parsed.data.url,
          brief: brief ?? null,
          competitors: output.competitors,
          goalCandidates: output.goalCandidates,
          researchBrief: output.researchBrief || null,
          locale
        })
        .returning()

      const rows = await tx
        .insert(hypotheses)
        .values(
          ranked.map((h) => ({
            analysisId: created.id,
            section: h.section,
            problem: h.problem,
            currentCopy: h.current_copy,
            impactScore: h.impact_score,
            effortScore: h.effort_score,
            rationale: h.rationale,
            selector: h.selector,
            target: h.target
          }))
        )
        .returning()

      const variantRows = await tx
        .insert(variants)
        .values(
          rows.flatMap((row, i) =>
            ranked[i].variants.map((variant, position) => ({
              hypothesisId: row.id,
              copy: variant.copy,
              evidence: variant.evidence,
              position
            }))
          )
        )
        .returning()

      // Ranked the same way as the hypotheses, and empty when playbook generation failed -- an
      // analysis without a playbook is still a complete analysis.
      const rankedFixes = [...output.playbook].sort((a, b) => b.impact_score - a.impact_score)
      const fixRows = rankedFixes.length
        ? await tx
            .insert(flowFixes)
            .values(
              rankedFixes.map((fix, position) => ({
                analysisId: created.id,
                category: fix.category,
                title: fix.title,
                problem: fix.problem,
                steps: fix.steps,
                impactScore: fix.impact_score,
                effortScore: fix.effort_score,
                evidence: fix.evidence,
                position
              }))
            )
            .returning()
        : []

      // Roll the monthly window on write: a lapsed period restarts at this analysis rather than
      // carrying a stale count forward.
      const rolled = periodExpired(user.usagePeriodStart)
      await tx
        .update(users)
        .set(
          rolled
            ? { analysesCount: 1, usagePeriodStart: new Date() }
            : { analysesCount: sql`${users.analysesCount} + 1` }
        )
        .where(eq(users.id, user.id))

      return {
        ...created,
        flowFixes: fixRows,
        hypotheses: rows.map((row) => ({
          ...row,
          variants: variantRows.filter((v) => v.hypothesisId === row.id)
        }))
      }
    })

    return NextResponse.json({ analysis }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const PagingSchema = z.coerce.number().int().positive().optional().catch(undefined)

  const { rows, total, page } = await listAnalysesForUser(user, {
    page: PagingSchema.parse(searchParams.get('page') ?? undefined),
    limit: PagingSchema.parse(searchParams.get('limit') ?? undefined)
  })

  return NextResponse.json({ analyses: rows, total, page })
}
