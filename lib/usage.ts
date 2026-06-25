import type { User } from '@/db/schema'
import { FREE_ANALYSES_LIMIT } from '@/lib/constants'

export function hasReachedFreeLimit(user: Pick<User, 'plan' | 'analysesCount'>): boolean {
  return user.plan === 'free' && user.analysesCount >= FREE_ANALYSES_LIMIT
}

export function usageFor(user: Pick<User, 'plan' | 'analysesCount'>) {
  return {
    analyses_count: user.analysesCount,
    limit: user.plan === 'free' ? FREE_ANALYSES_LIMIT : null,
    plan: user.plan
  }
}
