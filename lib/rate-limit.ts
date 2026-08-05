import { randomUUID } from 'node:crypto'
import Redis from 'ioredis'
import { NextResponse } from 'next/server'
import { RATE_LIMITS } from '@/lib/constants'
import type { RateLimitKind } from '@/lib/enums'

// Counters live outside the process because more than one app instance can serve the same visitor.
// With no REDIS_URL configured -- local dev, the e2e suite -- every check passes: a limiter that
// failed closed would turn a missing env var into a total outage.
//
// The client is cached on globalThis because Next's dev server re-evaluates modules on every edit,
// and a fresh connection per reload exhausts Redis' client limit within an afternoon.
const globalForRedis = globalThis as unknown as { redis?: Redis | null }

function client(): Redis | null {
  if (globalForRedis.redis !== undefined) return globalForRedis.redis

  const url = process.env.REDIS_URL

  globalForRedis.redis = url
    ? new Redis(url, {
        // A rate limiter must never be what makes a request hang, and it must not fail open just
        // because it was called during startup. The offline queue is left ON so the first commands
        // wait for the handshake instead of being rejected outright -- with it off and no
        // connection yet, every early check silently allowed the request. commandTimeout is the
        // hard bound that keeps that queue from becoming a stall when Redis is genuinely down.
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
        commandTimeout: 1_000
      })
    : null

  // ioredis emits 'error' on an unreachable server, and an unhandled 'error' event takes the whole
  // process down. Logging it keeps a Redis outage a degraded limiter rather than a dead app.
  globalForRedis.redis?.on('error', (error) => {
    console.error('[rate-limit] redis error', error.message)
  })

  return globalForRedis.redis
}

// A sliding window over a sorted set, as one script so the read and the write cannot interleave
// between two callers. Members are unique per request, so identical timestamps never collide.
// Returns [allowed, resetAtMs] -- resetAtMs is when the oldest hit in the window expires, which is
// the earliest moment this caller could succeed.
const SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

if redis.call('ZCARD', key) >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  return {0, math.floor(tonumber(oldest[2]) + window)}
end

redis.call('ZADD', key, now, ARGV[4])
redis.call('PEXPIRE', key, window)

return {1, 0}
`

// Vercel set x-forwarded-for from the edge and Railway's proxy does the same, so the client entry is
// the leftmost value. Falls back to a shared bucket rather than to no limit at all.
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
  const redis = client()
  if (!redis) return null

  const { tokens, windowMs } = RATE_LIMITS[kind]
  const now = Date.now()

  let allowed: number
  let resetAt: number

  try {
    const [ok, reset] = (await redis.eval(
      SLIDING_WINDOW,
      1,
      `ratelimit:${kind}:${identifier}`,
      now,
      windowMs,
      tokens,
      randomUUID()
    )) as [number, number]

    allowed = ok
    resetAt = reset
  } catch (error) {
    // Same reasoning as an unset REDIS_URL: infrastructure being down degrades the limiter, it does
    // not take the product with it. Logged so it is diagnosable rather than silently permissive.
    console.error('[rate-limit] check failed, allowing request', error)
    return null
  }

  if (allowed === 1) return null

  const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000))

  return NextResponse.json(
    { error: 'rate_limited' },
    { status: 429, headers: { ...headers, 'Retry-After': String(retryAfter) } }
  )
}
