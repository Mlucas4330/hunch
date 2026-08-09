import { secretsMatch } from '@/lib/secure-compare'

export function authorizeCron(request: Request): boolean {
  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '')

  return secretsMatch(presented, process.env.CRON_SECRET)
}
