'use client'

import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'
import { BYTES_PER_MEGABYTE, MS_PER_SECOND, READOUT_SEVERITY_CLASS } from '@/lib/constants'
import { READOUT_GROUP } from '@/lib/enums'
import { formatDecimal, formatNumber, t } from '@/lib/i18n/format'
import { hasReadout, readout, type MeasuredFinding, type ReadoutInput } from '@/lib/readout'
import type { Locale } from '@/lib/enums'
import { cn } from '@/lib/utils'

// The one section of the product that states numbers. Everything it renders was counted on the
// scraped page by lib/readout.ts; nothing here was written by a model, and nothing here is passed to
// one. The quantitative ban on generated `evidence` is untouched and unrelated -- see lib/readout.ts.
//
// Rendered on all three analysis surfaces, like FlowPlaybook, and returns null when there is nothing
// measured. That null is what lets every analysis created before these columns existed simply not
// have the section, with no migration and nothing regenerated.
export function MeasuredReadout({
  input,
  className
}: {
  input: ReadoutInput
  className?: string
}) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout
  const measured = readout(input)

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
                  <p
                    className={cn(
                      'inline-block rounded px-1.5 py-0.5 font-display text-lg font-semibold tabular-nums',
                      READOUT_SEVERITY_CLASS[finding.severity]
                    )}
                  >
                    {renderValue(finding, copy, locale)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {measured.comparison.length > 0 && (
        <div className="space-y-2 break-inside-avoid">
          <p className="panel-label text-[0.6rem] text-muted-foreground">
            {copy.comparison.title}
          </p>
          {/* The one wide element on the page, and the report is read on a phone as often as not. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-md border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2 font-medium" />
                  <th className="p-2 font-display font-semibold">{copy.comparison.you}</th>
                  {measured.comparison[0].competitors.map((competitor) => (
                    <th
                      key={competitor.name}
                      className="p-2 font-mono text-xs font-normal text-muted-foreground"
                    >
                      {competitor.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {measured.comparison.map((row) => (
                  <tr key={row.metric} className="border-b last:border-0">
                    <td className="p-2 text-muted-foreground">
                      {copy.comparison.metrics[row.metric]}
                    </td>
                    <td className="p-2 font-display font-semibold tabular-nums">
                      {renderCell(row.self, copy, locale)}
                    </td>
                    {row.competitors.map((competitor) => (
                      <td key={competitor.name} className="p-2 tabular-nums text-muted-foreground">
                        {renderCell(competitor.value, copy, locale)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">{copy.comparison.hint}</p>
        </div>
      )}
    </section>
  )
}

type ReadoutCopy = ReturnType<typeof useI18n>['dictionary']['readout']

// The readout keeps every measurement in the unit it was taken in, so this is the only place bytes
// become MB and milliseconds become seconds -- rounding once, at the edge, rather than twice.
function renderValue(finding: MeasuredFinding, copy: ReadoutCopy, locale: Locale): string {
  switch (finding.unit) {
    case 'presence':
      return finding.value === 1 ? copy.presence.yes : copy.presence.no
    case 'seconds':
      return t(copy.units.seconds, {
        value: formatDecimal(finding.value / MS_PER_SECOND, locale, 1)
      })
    case 'megabytes': {
      const size = t(copy.units.megabytes, {
        value: formatDecimal(finding.value / BYTES_PER_MEGABYTE, locale, 1)
      })
      // Media is blocked during the scrape, so a page with a hero video transferred more than this.
      // Saying so is cheaper than being caught overstating by a reader who checks.
      return `${copy.atLeast} ${size}`
    }
    default:
      return formatNumber(finding.value, locale)
  }
}

function renderCell(value: number | boolean, copy: ReadoutCopy, locale: Locale): string {
  if (typeof value === 'boolean') return value ? copy.presence.yes : copy.presence.no
  return formatNumber(value, locale)
}
