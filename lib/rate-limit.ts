import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { RATE_LIMITS } from '@/lib/constants'
import type { RateLimitKind } from '@/lib/enums'

// Serverless invocations share no memory, so the counters have to live outside the process. With no
// Redis configured -- local dev, the e2e suite -- every check passes: a limiter that fails closed
// would turn a missing env var into a total outage.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null

const limiters = new Map<RateLimitKind, Ratelimit>()

function limiterFor(kind: RateLimitKind): Ratelimit | null {
  if (!redis) return null

  const existing = limiters.get(kind)
  if (existing) return existing

  const { tokens, window } = RATE_LIMITS[kind]
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: `ratelimit:${kind}`,
    analytics: false
  })

  limiters.set(kind, limiter)
  return limiter
}

// Vercel sets x-forwarded-for from the edge, so the client entry is the leftmost value. Falls back
// to a shared bucket rather than to no limit at all.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

// Returns the 429 to send back, or null to continue -- so a guarded route reads as one early return.
export async function enforceRateLimit(
  kind: RateLimitKind,
  identifier: string,
  headers?: HeadersInit
): Promise<NextResponse | null> {
  const limiter = limiterFor(kind)
  if (!limiter) return null

  const { success, reset } = await limiter.limit(identifier)
  if (success) return null

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'rate_limited' },
    { status: 429, headers: { ...headers, 'Retry-After': String(retryAfter) } }
  )
}
