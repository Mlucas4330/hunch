import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { RATE_LIMITS } from '@/lib/constants'
import { redis } from '@/lib/redis'
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

function unavailable(headers?: HeadersInit): NextResponse {
  return NextResponse.json({ error: 'rate_limit_unavailable' }, { status: 503, headers })
}

/**
 * Returns a response to send when the caller is over the limit, or `null` to let the request
 * through.
 *
 * **The default fails open, deliberately** — a missing or broken Redis means no limit rather than an
 * outage. See docs/invariants.md.
 *
 * `failClosed` is the one documented exception, and it exists because the trade reverses on an
 * unauthenticated route that spends real money: with anonymous analysis, failing open means every
 * stranger on the internet can open a browser against our three slots, unmetered. That is not a
 * degraded feature, it is the bill and the outage at once. Use it only where those two things are
 * true — no session, and real cost per call.
 */
export async function enforceRateLimit(
  kind: RateLimitKind,
  identifier: string,
  headers?: HeadersInit,
  options: { failClosed?: boolean } = {}
): Promise<NextResponse | null> {
  // **The budgets are sized by what a route costs us, and under fixtures a route costs nothing** —
  // `E2E_FIXTURES` replaces the scrape and the model call, so no browser opens and no tokens are
  // spent. `analysis` is 5/hour against a suite that creates six, which made a full run impossible:
  // the sixth answered 429 with Redis reachable, and the first answered 503 without it.
  //
  // This is safe only because the flag is already a total-breakage switch: an app running with it set
  // serves fixture data instead of measuring anything, so it can never be production. **Never reach
  // for a flag that only disables the limiter** — that one would be worth setting by mistake.
  if (process.env.E2E_FIXTURES === '1') return null

  const client = redis()
  if (!client) {
    if (options.failClosed) {
      console.error('[rate-limit] no redis and this route fails closed, refusing')
      return unavailable(headers)
    }
    return null
  }

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
    if (options.failClosed) {
      console.error('[rate-limit] check failed and this route fails closed, refusing', error)
      return unavailable(headers)
    }
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
