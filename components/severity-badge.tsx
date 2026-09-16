'use client'

import { Badge } from '@/components/ui/badge'
import { ERROR_SEVERITY_BADGE_CLASS, severityForImpact } from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

/**
 * How bad this error is, in one word.
 *
 * **It takes the impact score, never a severity.** Nothing stores one: `severityForImpact` cuts the
 * scale in the single place it is cut, so the word here and the colour on the rail beside it are the
 * same decision read twice rather than two decisions that could disagree. See docs/readout.md.
 */
export function SeverityBadge({ score, className }: { score: number; className?: string }) {
  const { dictionary } = useI18n()
  const severity = severityForImpact(score)

  return (
    <Badge className={cn(ERROR_SEVERITY_BADGE_CLASS[severity], className)}>
      {dictionary.labels.severity[severity]}
    </Badge>
  )
}
