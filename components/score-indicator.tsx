'use client'

import { impactScoreBadgeClass, impactScoreRailClass } from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import { t } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

/**
 * Impact, and only impact -- there is no effort scale, on any surface. See docs/analysis-ui.md.
 *
 * Two shapes now, and the ten-segment meter is not one of them. The meter printed the same fact
 * three times (bars, `9/10`, and the colour), carried the word IMPACTO beside it, and was `shrink-0`
 * at roughly 290px -- which is what crowded every card header it sat in.
 *
 * - `rail` is the ranked-row treatment: a fixed-width block down the left edge of a `DisclosureCard`,
 *   tinted by impact, identical whether the row is open or closed.
 * - `compact` is the inline chip, for anywhere a rail cannot go.
 */
export function ScoreIndicator({
  score,
  variant = 'rail'
}: {
  score: number
  variant?: 'rail' | 'compact'
}) {
  const { dictionary } = useI18n()
  const aria = t(dictionary.score.aria, { label: dictionary.score.impact, score })

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'rounded-sm px-1.5 py-0.5 font-mono text-[0.7rem] font-semibold tabular-nums',
          impactScoreBadgeClass(score)
        )}
        aria-label={aria}
      >
        {dictionary.score.short.impact}
        {score}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'flex w-14 shrink-0 flex-col items-center justify-center border-r font-mono tabular-nums',
        impactScoreRailClass(score)
      )}
      aria-label={aria}
    >
      <span className="text-xl font-semibold leading-none">{score}</span>
      <span className="text-[0.65rem] leading-none opacity-70" aria-hidden>
        /10
      </span>
    </span>
  )
}
