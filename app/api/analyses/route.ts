import { NextResponse } from 'next/server'
import { desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, hypotheses, variants } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { analyzeLandingPage } from '@/lib/analyze'
import { ScrapeError } from '@/lib/scrape'

const BodySchema = z.object({
  url: z.string().url(),
  brief: z.string().trim().max(2000).optional(),
  competitorUrls: z.array(z.string().url()).max(3).optional()
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_url' }, { status: 422 })

  const brief = parsed.data.brief || undefined
  const competitorUrls = parsed.data.competitorUrls

  let output
  try {
    output = await analyzeLandingPage(parsed.data.url, { brief, competitorUrls })
  } catch (error) {
    if (error instanceof ScrapeError) {
      return NextResponse.json({ error: 'scrape_failed' }, { status: 502 })
    }
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
          competitors: output.competitors
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
            rationale: h.rationale
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

      return {
        ...created,
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
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 10))
  const offset = (page - 1) * limit

  const rows = await db
    .select()
    .from(analyses)
    .where(eq(analyses.userId, user.id))
    .orderBy(desc(analyses.createdAt))
    .limit(limit)
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyses)
    .where(eq(analyses.userId, user.id))

  return NextResponse.json({ analyses: rows, total: count, page })
}
