'use client'

import { useI18n } from '@/components/i18n-provider'
import { READOUT_SEVERITY_CLASS } from '@/lib/constants'
import { t } from '@/lib/i18n/format'
import { scoreSeverity } from '@/lib/score'
import { cn } from '@/lib/utils'

export function ReadoutScore({
  score,
  competitorScore = null,
  competitorHost = null
}: {
  score: number | null
  competitorScore?: number | null
  competitorHost?: string | null
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.readout.score

  if (score === null) return null

  return (
    <div
      className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-start sm:gap-8 sm:p-6"
      data-testid="readout-score"
    >
      <div className="shrink-0">
        <p className="panel-label text-micro text-muted-foreground">{copy.label}</p>
        {/* `bg-transparent` moves the severity tint to the pseudo-element `animate-score-settle`
            fills, drawn from `currentColor`. See app/globals.css. */}
        <p
          className={cn(
            'animate-score-settle relative isolate mt-2 inline-block rounded-md px-3 py-1 font-display text-5xl font-bold tabular-nums sm:text-6xl',
            READOUT_SEVERITY_CLASS[scoreSeverity(score)],
            'bg-transparent'
          )}
        >
          {score}
          <span className="text-xl font-semibold sm:text-2xl">/100</span>
        </p>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-sm leading-snug text-muted-foreground">{copy.scale}</p>
        {competitorScore !== null && competitorHost && (
          <p className="truncate font-mono text-sm tabular-nums text-muted-foreground">
            {t(copy.competitor, { host: competitorHost, score: competitorScore })}
          </p>
        )}
      </div>
    </div>
  )
}
