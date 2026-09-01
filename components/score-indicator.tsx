'use client'

import {
  IMPACT_SCORE_MAX,
  impactScoreBadgeClass,
  impactScoreRailClass
} from '@/lib/constants'
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
          'rounded-sm px-1.5 py-0.5 font-mono text-micro font-semibold tabular-nums',
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
        'relative flex w-14 shrink-0 flex-col items-center justify-center overflow-hidden border-r font-mono tabular-nums',
        impactScoreRailClass(score)
      )}
      aria-label={aria}
    >
      {/* **A gauge with a level, where the health rail beside it is a solid plate.**
       *
       * The two rails were the same widget: a fixed-width tinted block with a big number and a small
       * denominator, one saying 87 out of 100 and one saying 9 out of 10, four cards apart on the
       * same screen. docs/readout.md names that as where a reader stops trusting either number, and
       * printing the denominators was only half an answer -- a denominator is read, and the shape is
       * what is scanned.
       *
       * So impact fills from the bottom in proportion to itself and health stays a plate. The bar is
       * `bg-current`, so it takes the band colour from `impactScoreRailClass` like the numeral does
       * and no colour is written here. It is `aria-hidden` because it is the same fact as the label
       * already on the wrapper. */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-current opacity-15"
        style={{ height: `${(score / IMPACT_SCORE_MAX) * 100}%` }}
        aria-hidden
      />
      <span className="relative text-xl font-semibold leading-none">{score}</span>
      <span className="relative text-micro leading-none opacity-70" aria-hidden>
        /{IMPACT_SCORE_MAX}
      </span>
    </span>
  )
}
