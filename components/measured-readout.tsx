'use client'

import { InfoHint } from '@/components/info-hint'
import { KeywordTable } from '@/components/keyword-table'
import { ReadoutScore } from '@/components/readout-score'
import { ReadoutTrend } from '@/components/readout-trend'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'
import { BYTES_PER_MEGABYTE, MS_PER_SECOND, READOUT_SEVERITY_CLASS } from '@/lib/constants'
import { READOUT_GROUP } from '@/lib/enums'
import { formatDecimal, formatNumber, t } from '@/lib/i18n/format'
import {
  hasReadout,
  readout,
  type MeasuredFinding,
  type ReadoutInput
} from '@/lib/readout'
import { deltas, type ScorePoint } from '@/lib/snapshots'
import type { Locale, ReadoutUnit } from '@/lib/enums'
import { cn } from '@/lib/utils'

export function MeasuredReadout({
  input,
  previous = null,
  scores = [],
  className
}: {
  input: ReadoutInput
  previous?: ReadoutInput | null
  scores?: ScorePoint[]
  className?: string
}) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout
  const measured = readout(input)
  const moved = deltas(input, previous)

  if (!hasReadout(measured)) return null

  return (
    <section className={cn('space-y-4', className)} data-testid="measured-readout">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight">{copy.title}</h2>
          <span className="print:hidden">
            <InfoHint label={copy.hintLabel}>
              <RichText>{copy.hint}</RichText>
            </InfoHint>
          </span>
        </div>
      </div>

      <ReadoutScore findings={measured.findings} />

      <ReadoutTrend points={scores} />

      {READOUT_GROUP.map((group) => {
        const rows = measured.findings.filter((finding) => finding.group === group)
        if (rows.length === 0) return null

        return (
          <div key={group} className="space-y-2 break-inside-avoid">
            <p className="panel-label text-[0.6rem] text-muted-foreground">{copy.groups[group]}</p>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
              {rows.map((finding) => (
                <div key={finding.id} className="space-y-1 bg-card p-3" data-testid="readout-finding">
                  <p className="text-xs leading-snug text-muted-foreground">
                    {copy.findings[finding.id]}
                  </p>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <p
                      className={cn(
                        'inline-block rounded px-1.5 py-0.5 font-display text-lg font-semibold tabular-nums',
                        READOUT_SEVERITY_CLASS[finding.severity]
                      )}
                    >
                      {renderValue(finding, copy, locale)}
                    </p>
                    {moved.has(finding.id) && (
                      <span className="font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                        {renderDelta(moved.get(finding.id) ?? 0, finding.unit, copy, locale)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <KeywordTable keywords={input.keywords} />
    </section>
  )
}

type ReadoutCopy = ReturnType<typeof useI18n>['dictionary']['readout']

function renderValue(finding: MeasuredFinding, copy: ReadoutCopy, locale: Locale): string {
  return renderUnit(finding.value, finding.unit, copy, locale)
}

// Arithmetic between two measurements of the same page, shown in the same unit and with no verdict
// attached: the number moved, and nothing here says why. See docs/invariants.md.
function renderDelta(
  delta: number,
  unit: ReadoutUnit,
  copy: ReadoutCopy,
  locale: Locale
): string {
  if (unit === 'presence') {
    return delta > 0 ? copy.delta.gained : copy.delta.lost
  }

  const size = renderUnit(Math.abs(delta), unit, copy, locale)
  return t(delta > 0 ? copy.delta.up : copy.delta.down, { value: size })
}

function renderUnit(
  value: number,
  unit: ReadoutUnit,
  copy: ReadoutCopy,
  locale: Locale
): string {
  switch (unit) {
    case 'presence':
      return value === 1 ? copy.presence.yes : copy.presence.no
    case 'seconds':
      return t(copy.units.seconds, { value: formatDecimal(value / MS_PER_SECOND, locale, 1) })
    case 'megabytes': {
      const size = t(copy.units.megabytes, {
        value: formatDecimal(value / BYTES_PER_MEGABYTE, locale, 1)
      })
      return `${copy.atLeast} ${size}`
    }
    default:
      return formatNumber(value, locale)
  }
}
