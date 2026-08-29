'use client'

import { useI18n } from '@/components/i18n-provider'
import { READOUT_SEVERITY_CLASS } from '@/lib/constants'
import { formatNumber, t } from '@/lib/i18n/format'
import { readoutScore, scoreSeverity } from '@/lib/score'
import type { MeasuredFinding } from '@/lib/readout'
import { cn } from '@/lib/utils'

export function ReadoutScore({ findings }: { findings: MeasuredFinding[] }) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout.score
  const score = readoutScore(findings)

  if (score.overall === null) return null

  return (
    <div
      className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-start sm:gap-8 sm:p-6"
      data-testid="readout-score"
    >
      {/* min-w-0 all the way down: a flex item defaults to min-width:auto, which refuses to shrink
          below its content and is what pushed this row past the viewport on a phone. */}
      <div className="shrink-0">
        <p className="panel-label text-[0.65rem] text-muted-foreground">{copy.label}</p>
        <p
          className={cn(
            'mt-2 inline-block rounded-md px-3 py-1 font-display text-5xl font-bold tabular-nums sm:text-6xl',
            READOUT_SEVERITY_CLASS[scoreSeverity(score.overall)]
          )}
        >
          {score.overall}
          <span className="text-xl font-semibold sm:text-2xl">/100</span>
        </p>
      </div>

      {/* Both sentences are load-bearing and neither may move into an InfoHint: this card renders on
          the public report and on paper, where a tooltip is a click nobody makes and a print that
          never appears. See docs/readout.md.

          **The per-group bars used to live here and are gone.** Every group now carries its own
          score in its own card below, so the bars were the same six numbers stated twice -- and the
          reader had to match a label in this card against a heading further down to join them. */}
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-sm leading-snug text-muted-foreground">{copy.scale}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(copy.method, { count: formatNumber(findings.length, locale) })}
        </p>
      </div>
    </div>
  )
}
