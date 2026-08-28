import Redis from 'ioredis'
import { log } from '@/lib/log'

// One client for the whole process, pinned to `globalThis` for the same reason the browser pool is:
// Next re-evaluates modules on every edit in dev and splits server bundles per route, so a
// module-scope singleton risks being one-per-bundle. See docs/scraping.md.
const globalForRedis = globalThis as unknown as { redis?: Redis | null }

export function redis(): Redis | null {
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
    log.error('redis.error', error)
  })

  return globalForRedis.redis
}
