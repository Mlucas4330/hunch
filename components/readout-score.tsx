'use client'

import { useI18n } from '@/components/i18n-provider'
import { READOUT_SEVERITY_CLASS, READOUT_SEVERITY_FILL_CLASS } from '@/lib/constants'
import { READOUT_GROUP } from '@/lib/enums'
import { formatNumber, t } from '@/lib/i18n/format'
import { readoutScore, scoreSeverity } from '@/lib/score'
import type { MeasuredFinding } from '@/lib/readout'
import { cn } from '@/lib/utils'

export function ReadoutScore({ findings }: { findings: MeasuredFinding[] }) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout.score
  const groups = dictionary.readout.groups
  const score = readoutScore(findings)

  if (score.overall === null) return null

  return (
    <div
      className="flex flex-col gap-6 rounded-lg border bg-card p-5 sm:p-6 lg:flex-row lg:items-start lg:gap-8"
      data-testid="readout-score"
    >
      <div className="lg:w-64 lg:shrink-0">
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
        <p className="mt-3 text-sm leading-snug text-muted-foreground">{copy.scale}</p>
      </div>

      <div className="flex-1 space-y-4">
        <div className="grid gap-3">
          {READOUT_GROUP.map((group) => {
            const value = score.groups[group]
            if (value === null) return null

            return (
              <div key={group} className="flex items-center gap-3">
                <p className="flex-1 truncate text-sm text-muted-foreground">{groups[group]}</p>
                <div className="h-2.5 w-28 overflow-hidden rounded-full bg-muted sm:w-40">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      READOUT_SEVERITY_FILL_CLASS[scoreSeverity(value)]
                    )}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <p className="w-9 text-right font-mono text-sm font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            )
          })}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(copy.method, { count: formatNumber(findings.length, locale) })}
        </p>
      </div>
    </div>
  )
}
