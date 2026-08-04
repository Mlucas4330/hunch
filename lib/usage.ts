import type { User } from '@/db/schema'
import { FREE_ANALYSES_LIMIT, FREE_EXPERIMENTS_LIMIT } from '@/lib/constants'

type UsageUser = Pick<User, 'plan' | 'analysesCount' | 'usagePeriodStart'>

// The free allowance is monthly, but nothing resets it on a schedule -- it rolls lazily. Every read
// and every write asks "is the stored period still the current one?", so a missed cron or an idle
// month can never leave a user permanently capped.
export function periodExpired(periodStart: Date, now: Date = new Date()): boolean {
  const next = new Date(periodStart)
  next.setMonth(next.getMonth() + 1)
  return now >= next
}

// The count as it should be read right now: zero once the stored period has rolled over.
export function effectiveAnalysesCount(user: UsageUser, now: Date = new Date()): number {
  return periodExpired(user.usagePeriodStart, now) ? 0 : user.analysesCount
}

export function hasReachedFreeLimit(user: UsageUser, now: Date = new Date()): boolean {
  return user.plan === 'free' && effectiveAnalysesCount(user, now) >= FREE_ANALYSES_LIMIT
}

export function hasReachedFreeExperimentLimit(
  user: Pick<User, 'plan'>,
  runningCount: number
): boolean {
  return user.plan === 'free' && runningCount >= FREE_EXPERIMENTS_LIMIT
}

export function canExport(plan: User['plan']): boolean {
  return plan !== 'free'
}

export function usageFor(user: UsageUser, now: Date = new Date()) {
  return {
    analyses_count: effectiveAnalysesCount(user, now),
    limit: user.plan === 'free' ? FREE_ANALYSES_LIMIT : null,
    plan: user.plan
  }
}
