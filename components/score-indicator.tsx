'use client'

import {
  effortScoreBadgeClass,
  effortScoreFillClass,
  impactScoreBadgeClass,
  impactScoreFillClass
} from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import { t } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

const SEGMENTS = Array.from({ length: 10 }, (_, i) => i)

// `compact` trades the gauge for a single tinted chip. A screen that stacks ten or more rows cannot
// afford ten gauges; the aria-label is identical either way, so nothing is lost to a screen reader.
export function ScoreIndicator({
  score,
  kind,
  variant = 'meter'
}: {
  score: number
  kind: 'impact' | 'effort'
  variant?: 'meter' | 'compact'
}) {
  const { dictionary } = useI18n()
  const label = dictionary.score[kind]
  const aria = t(dictionary.score.aria, { label, score })

  if (variant === 'compact') {
    const tint = kind === 'impact' ? impactScoreBadgeClass(score) : effortScoreBadgeClass(score)
    return (
      <span
        className={cn(
          'rounded-sm px-1.5 py-0.5 font-mono text-[0.7rem] font-semibold tabular-nums',
          tint
        )}
        aria-label={aria}
      >
        {dictionary.score.short[kind]}
        {score}
      </span>
    )
  }

  const fill = kind === 'impact' ? impactScoreFillClass(score) : effortScoreFillClass(score)

  return (
    <div className="flex items-center gap-2" aria-label={aria}>
      <span className="panel-label text-[0.6rem] text-muted-foreground">{label}</span>
      <div className="flex items-end gap-0.5" aria-hidden>
        {SEGMENTS.map((i) => (
          <span key={i} className={cn('h-3.5 w-1 rounded-[1px]', i < score ? fill : 'bg-muted')} />
        ))}
      </div>
      <span className="font-mono text-xs font-semibold tabular-nums">
        {score}
        <span className="text-muted-foreground">/10</span>
      </span>
    </div>
  )
}
