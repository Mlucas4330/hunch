import { randomUUID } from 'node:crypto'
import Redis from 'ioredis'
import { NextResponse } from 'next/server'
import { RATE_LIMITS } from '@/lib/constants'
import type { RateLimitKind } from '@/lib/enums'

const globalForRedis = globalThis as unknown as { redis?: Redis | null }

function client(): Redis | null {
  if (globalForRedis.redis !== undefined) return globalForRedis.redis

  const url = process.env.REDIS_URL

  globalForRedis.redis = url
    ? new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
        commandTimeout: 1_000
      })
    : null

  globalForRedis.redis?.on('error', (error) => {
    console.error('[rate-limit] redis error', error.message)
  })

  return globalForRedis.redis
}

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
