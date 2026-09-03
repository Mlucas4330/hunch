import { NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses, hypotheses, variants } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { isUuid } from '@/lib/uuid'
import { generateAlternateVariants } from '@/lib/analyze'
import { VARIANT_COPY_MAX_CHARS } from '@/lib/constants'
import { roundsLeft } from '@/lib/variant-rounds'
import { VARIANT_TONE } from '@/lib/enums'

export const runtime = 'nodejs'

// Optional, and a bad body is the same as none: the direction is a nicety and a malformed one must
// not cost the reader the round they asked for.
const ToneSchema = z.object({ tone: z.enum(VARIANT_TONE) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
        columns: { userId: true, brief: true, locale: true, market: true }
      },
      variants: { orderBy: (v, { asc }) => asc(v.position) }
    }
  })

  if (!hypothesis || hypothesis.analysis.userId !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const written = hypothesis.variants.filter((variant) => variant.author === 'model')
  const rounds = roundsLeft(hypothesis.variants)
  if (rounds === 0) {
    return NextResponse.json({ variants: hypothesis.variants, roundsLeft: 0 })
  }

  const recommended = hypothesis.variants[0]
  if (!recommended) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const tone = ToneSchema.safeParse(await request.json().catch(() => null))

  let generated
  try {
    generated = await generateAlternateVariants({
      section: hypothesis.section,
      problem: hypothesis.problem,
      currentCopy: hypothesis.currentCopy,
      rationale: hypothesis.rationale,
      recommendedCopy: recommended.copy,
      // **Every line already written, not just the recommended one.** Without this, round three is a
      // fresh draw from the same distribution and can hand back round one. See docs/ai-pipeline.md.
      alreadyWritten: written.map((variant) => variant.copy),
      tone: tone.success ? tone.data.tone : null,
      emphasized: recommended.emphasis !== null,
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

  return NextResponse.json({ variants: all, roundsLeft: rounds - 1 })
}

/**
 * Which line the owner is going to use: one of the written ones, or their own.
 *
 * **Choosing is reordering, because position 0 already means "the one".** The card reads it, the
 * screenshot route reads it, and the harness reads it, so promoting a variant carries the preview and
 * the verdict along with it and no `chosen` column exists to disagree with any of them.
 *
 * What the model first recommended is still recoverable afterwards: the generation writes exactly one
 * variant per hypothesis and the alternates arrive later, so the oldest row is the recommendation
 * however the positions end up. See scripts/rewrite-stats.mts.
 */
const ChooseSchema = z.union([
  z.object({ variantId: z.string().refine(isUuid) }),
  // The owner's own words. A cap rather than a budget: `variantWordBudget` and `variantCharBudget`
  // are warnings on the page they belong to, never a refusal, because it is that reader's page and
  // the best rewrite of the day went over one of them. This is only here so the column cannot be
  // used as storage.
  z.object({ copy: z.string().trim().min(1).max(VARIANT_COPY_MAX_CHARS) })
])

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const parsed = ChooseSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 422 })

  const hypothesis = await db.query.hypotheses.findFirst({
    where: eq(hypotheses.id, id),
    with: {
      analysis: { columns: { userId: true } },
      variants: { orderBy: (v, { asc }) => asc(v.position) }
    }
  })

  if (!hypothesis || hypothesis.analysis.userId !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const current = hypothesis.variants.find((variant) => variant.position === 0)
  if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const body = parsed.data

  if ('copy' in body) {
    // **A new row, never an overwrite.** What the model proposed stays next to what the reader
    // published, and the difference between the two is the label. `evidence` is null because nobody
    // argues for their own sentence. See docs/data-model.md.
    const position = hypothesis.variants.length
    await db.transaction(async (tx) => {
      await tx.update(variants).set({ position }).where(eq(variants.id, current.id))
      await tx.insert(variants).values({
        hypothesisId: hypothesis.id,
        copy: body.copy,
        author: 'owner',
        evidence: null,
        emphasis: null,
        position: 0
      })
    })
  } else {
    const chosen = hypothesis.variants.find((variant) => variant.id === body.variantId)
    if (!chosen) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    // A swap rather than a renumber: two rows move and every other position is left where it was, so
    // the list the reader was looking at does not rearrange itself under them.
    if (chosen.id !== current.id) {
      await db.transaction(async (tx) => {
        await tx
          .update(variants)
          .set({ position: chosen.position })
          .where(eq(variants.id, current.id))
        await tx.update(variants).set({ position: 0 }).where(eq(variants.id, chosen.id))
      })
    }
  }

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
