import type { User } from '@/db/schema'
import { FREE_ANALYSES_LIMIT } from '@/lib/constants'

type UsageUser = Pick<User, 'plan' | 'analysesCount' | 'usagePeriodStart'>

export function periodExpired(periodStart: Date, now: Date = new Date()): boolean {
  const next = new Date(periodStart)
  next.setMonth(next.getMonth() + 1)
  return now >= next
}

export function effectiveAnalysesCount(user: UsageUser, now: Date = new Date()): number {
  return periodExpired(user.usagePeriodStart, now) ? 0 : user.analysesCount
}

export function hasReachedFreeLimit(user: UsageUser, now: Date = new Date()): boolean {
  return user.plan === 'free' && effectiveAnalysesCount(user, now) >= FREE_ANALYSES_LIMIT
}

export function canWhiteLabel(plan: User['plan']): boolean {
  return plan !== 'free'
}

export function usageFor(user: UsageUser, now: Date = new Date()) {
  return {
    analyses_count: effectiveAnalysesCount(user, now),
    limit: user.plan === 'free' ? FREE_ANALYSES_LIMIT : null,
    plan: user.plan
  }
}
