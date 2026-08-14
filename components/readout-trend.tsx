'use client'

import { useI18n } from '@/components/i18n-provider'
import { TREND_CHART, TREND_SCORE_MAX } from '@/lib/constants'
import { formatDate } from '@/lib/i18n/format'
import type { ScorePoint } from '@/lib/snapshots'

// One series, one entity, one stable colour: the line is "the score over time", so it never takes
// the tint of whatever the latest value happens to be. See docs/readout.md.
export function ReadoutTrend({ points }: { points: ScorePoint[] }) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout.trend

  // Two points is the smallest thing that is a trend rather than a decoration.
  if (points.length < 2) return null

  const { width, height, padding, dotRadius } = TREND_CHART
  const span = points.length - 1
  const plotted = points.map((point, i) => ({
    ...point,
    x: padding + (i / span) * (width - padding * 2),
    y: padding + (1 - point.score / TREND_SCORE_MAX) * (height - padding * 2)
  }))
  const last = plotted[plotted.length - 1]

  return (
    <div className="space-y-1" data-testid="readout-trend">
      <p className="panel-label text-[0.6rem] text-muted-foreground">{copy.title}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-12 w-full max-w-xs"
        role="img"
        aria-label={`${copy.title}: ${plotted
          .map((p) => `${formatDate(p.capturedAt, locale)} ${p.score}`)
          .join(', ')}`}
      >
        <polyline
          points={plotted.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="var(--color-purple)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {plotted.map((point) => (
          <circle
            key={point.capturedAt.toISOString()}
            cx={point.x}
            cy={point.y}
            r={point === last ? dotRadius : dotRadius / 2}
            fill="var(--color-purple)"
            stroke="var(--color-card)"
            strokeWidth={2}
          >
            <title>{`${formatDate(point.capturedAt, locale)}: ${point.score}`}</title>
          </circle>
        ))}
      </svg>
      <p className="text-xs text-muted-foreground">{copy.hint}</p>
    </div>
  )
}
