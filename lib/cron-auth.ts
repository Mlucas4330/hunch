import { secretsMatch } from '@/lib/secure-compare'

// Shared by every /api/cron route so the bearer parse and the constant-time comparison cannot drift
// between them. Returns true when the caller presented the right secret; a route answers 401 on
// false, before doing any work.
export function authorizeCron(request: Request): boolean {
  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '')

  return secretsMatch(presented, process.env.CRON_SECRET)
}
