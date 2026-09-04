import { NextResponse } from 'next/server'
import { and, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'

const BodySchema = z.object({
  embedKeys: z.array(z.string().uuid()).max(20)
})

/**
 * Hands ownership of anonymous analyses to the person who just signed in.
 *
 * **The key is the whole claim, and that is safe only because of what it is.** An `embed_key` is an
 * unguessable uuid that never appears anywhere except the browser that started the run, so holding
 * one is evidence of having started it. What keeps that from being a hole is the `isNull(userId)`
 * filter: a key that already belongs to someone cannot be re-claimed, so the worst a leaked key does
 * is what it already did: let its holder read that report.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 422 })
  if (!parsed.data.embedKeys.length) return NextResponse.json({ claimed: 0 })

  try {
    const claimed = await db
      .update(analyses)
      .set({ userId: user.id })
      .where(and(inArray(analyses.embedKey, parsed.data.embedKeys), isNull(analyses.userId)))
      .returning({ id: analyses.id })

    return NextResponse.json({ claimed: claimed.length })
  } catch (error) {
    console.error('[api/analyses/claim] failed', error)
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 })
  }
}
