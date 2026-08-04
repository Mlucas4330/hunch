import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { waitlist } from '@/db/schema'
import { CORS_HEADERS, preflight } from '@/lib/cors'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const BodySchema = z.object({
  email: z.string().email(),
  phone: z.string().min(1).optional(),
  embedKey: z.string().uuid().optional()
})

export function OPTIONS() {
  return preflight()
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit('waitlist', clientIp(request), CORS_HEADERS)
  if (limited) return limited

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 422, headers: CORS_HEADERS })
  }

  const { email, phone, embedKey } = parsed.data
  await db.insert(waitlist).values({ email, phone, embedKey }).onConflictDoNothing()

  return NextResponse.json({ ok: true }, { status: 201, headers: CORS_HEADERS })
}
