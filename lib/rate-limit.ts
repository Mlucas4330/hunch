import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { RATE_LIMITS } from '@/lib/constants'
import { redis } from '@/lib/redis'
import { log } from '@/lib/log'
import type { RateLimitKind } from '@/lib/enums'

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

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Returns a response to send when the caller is over the limit, or `null` to let the request
 * through. A missing or broken Redis means no limit rather than an outage. See docs/invariants.md.
 */
export async function enforceRateLimit(
  kind: RateLimitKind,
  identifier: string,
  headers?: HeadersInit
): Promise<NextResponse | null> {
  // `E2E_FIXTURES` replaces the scrape and the model call, so a route costs nothing under it. The flag
  // already serves fixture data instead of measuring anything, so it can never be production.
  // **Never reach for a flag that only disables the limiter.**
  if (process.env.E2E_FIXTURES === '1') return null

  const client = redis()
  if (!client) return null

  const { tokens, windowMs } = RATE_LIMITS[kind]
  const now = Date.now()

  let allowed: number
  let resetAt: number

  try {
    const [ok, reset] = (await client.eval(
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
    log.error('rate_limit.failed_open', error, { kind })
    return null
  }

  if (allowed === 1) return null

  const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000))

  return NextResponse.json(
    { error: 'rate_limited' },
    { status: 429, headers: { ...headers, 'Retry-After': String(retryAfter) } }
  )
}
