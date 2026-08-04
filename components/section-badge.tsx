'use client'

import { Badge } from '@/components/ui/badge'
import { SECTION_BADGE_CLASS } from '@/lib/constants'
import type { Section } from '@/lib/enums'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

export function SectionBadge({ section, className }: { section: Section; className?: string }) {
  const { dictionary } = useI18n()

  return (
    <Badge className={cn(SECTION_BADGE_CLASS[section], className)}>
      {dictionary.labels.section[section]}
    </Badge>
  )
}
