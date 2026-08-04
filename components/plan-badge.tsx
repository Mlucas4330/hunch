'use client'

import { Badge } from '@/components/ui/badge'
import { PLAN_BADGE_CLASS } from '@/lib/constants'
import type { SubscriptionPlan } from '@/lib/enums'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

export function PlanBadge({ plan, className }: { plan: SubscriptionPlan; className?: string }) {
  const { dictionary } = useI18n()

  return (
    <Badge className={cn(PLAN_BADGE_CLASS[plan], className)}>{dictionary.labels.plan[plan]}</Badge>
  )
}
