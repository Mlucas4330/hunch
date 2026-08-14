import { NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, hypotheses, variants } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { isUuid } from '@/lib/uuid'
import { generateAlternateVariants } from '@/lib/analyze'
import { VARIANTS_PER_HYPOTHESIS } from '@/lib/constants'

export const runtime = 'nodejs'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('variants', user.id)
  if (limited) return limited

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const hypothesis = await db.query.hypotheses.findFirst({
    where: eq(hypotheses.id, id),
    with: {
      analysis: {
        columns: { userId: true, brief: true, researchBrief: true, locale: true, market: true }
      },
      variants: { orderBy: (v, { asc }) => asc(v.position) }
    }
  })

  if (!hypothesis || hypothesis.analysis.userId !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (hypothesis.variants.length >= VARIANTS_PER_HYPOTHESIS) {
    return NextResponse.json({ variants: hypothesis.variants })
  }

  const recommended = hypothesis.variants[0]
  if (!recommended) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let generated
  try {
    generated = await generateAlternateVariants({
      section: hypothesis.section,
      problem: hypothesis.problem,
      currentCopy: hypothesis.currentCopy,
      rationale: hypothesis.rationale,
      recommendedCopy: recommended.copy,
      emphasized: recommended.emphasis !== null,
      researchBrief: hypothesis.analysis.researchBrief,
      founderBrief: hypothesis.analysis.brief,
      locale: hypothesis.analysis.locale,
      market: hypothesis.analysis.market
    })
  } catch {
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }

  await db.insert(variants).values(
    generated.map((variant, i) => ({
      hypothesisId: hypothesis.id,
      copy: variant.copy,
      evidence: variant.evidence,
      emphasis: variant.emphasis,
      position: hypothesis.variants.length + i
    }))
  )

  const all = await db
    .select()
    .from(variants)
    .where(eq(variants.hypothesisId, hypothesis.id))
    .orderBy(asc(variants.position))

  return NextResponse.json({ variants: all })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const rows = await db
    .select({ variant: variants })
    .from(variants)
    .innerJoin(hypotheses, eq(variants.hypothesisId, hypotheses.id))
    .innerJoin(analyses, eq(hypotheses.analysisId, analyses.id))
    .where(and(eq(hypotheses.id, id), eq(analyses.userId, user.id)))
    .orderBy(asc(variants.position))

  return NextResponse.json({ variants: rows.map((row) => row.variant) })
}
