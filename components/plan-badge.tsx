import { Badge } from '@/components/ui/badge'
import { PLAN_BADGE_CLASS } from '@/lib/constants'
import type { SubscriptionPlan } from '@/lib/enums'
import { cn } from '@/lib/utils'

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  free: 'Free',
  solo: 'Solo',
  team: 'Team'
}

export function PlanBadge({ plan, className }: { plan: SubscriptionPlan; className?: string }) {
  return <Badge className={cn(PLAN_BADGE_CLASS[plan], className)}>{PLAN_LABEL[plan]}</Badge>
}
