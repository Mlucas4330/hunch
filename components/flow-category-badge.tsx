'use client'

import { Badge } from '@/components/ui/badge'
import { FLOW_CATEGORY_BADGE_CLASS } from '@/lib/constants'
import type { FlowCategory } from '@/lib/enums'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

export function FlowCategoryBadge({
  category,
  className
}: {
  category: FlowCategory
  className?: string
}) {
  const { dictionary } = useI18n()

  return (
    <Badge className={cn(FLOW_CATEGORY_BADGE_CLASS[category], className)}>
      {dictionary.labels.flowCategory[category]}
    </Badge>
  )
}
