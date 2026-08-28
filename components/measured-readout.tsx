'use client'

import { InfoHint } from '@/components/info-hint'
import { KeywordTable } from '@/components/keyword-table'
import { ReadoutScore } from '@/components/readout-score'
import { ReadoutTrend } from '@/components/readout-trend'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'
import { competitorValues } from '@/lib/competitor'
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
import type { Locale, ReadoutFinding, ReadoutUnit } from '@/lib/enums'
import { cn } from '@/lib/utils'

export function MeasuredReadout({
  input,
  previous = null,
  competitor = null,
  competitorHost = null,
  scores = [],
  fixes = {},
  className
}: {
  input: ReadoutInput
  previous?: ReadoutInput | null
  /**
   * A second page the reader named, measured by the same code.
   *
   * **It is a separate axis from `previous` and must never be shown as the same one.** `previous` is
   * this page last time and its difference renders as a signed delta; this is a different page right
   * now, and it renders as its own labelled value. Collapsing them into one cell would leave the
   * reader unable to tell "you improved by 3" from "they have 3 more".
   */
  competitor?: ReadoutInput | null
  competitorHost?: string | null
  scores?: ScorePoint[]
  /**
   * The titles of the generated fixes that answer each measured finding.
   *
   * **A third axis again, and the one that stops this being a list the reader has to join by hand.**
   * The report used to show 43 counted tiles here and up to 20 generated cards in the tabs below with
   * nothing tying them together, so "form has 7 fields" and "cut the form to three" were two
   * paragraphs the reader had to recognise as the same subject.
   *
   * A plain object rather than a Map because it crosses the server boundary. Empty for every analysis
   * with nothing generated -- which is every free one -- and that is what keeps this from becoming a
   * paywall tease inside the one section that is never gated. See docs/invariants.md.
   */
  fixes?: Partial<Record<ReadoutFinding, string[]>>
  className?: string
}) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout
  const measured = readout(input)
  const moved = deltas(input, previous)
  const theirs = competitor ? competitorValues(competitor, measured.findings) : null

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

        // **A group whose every check passed opens closed, and that is disclosure, not gating.** The
        // whole readout used to render expanded at once -- 41 findings across six grids, and four in
        // five of them saying nothing is wrong -- so the rows that needed attention were buried among
        // the rows that did not. Nothing here is behind a payment or a session: same reader, one
        // click, and the count is on the summary either way. The rule the readout is never gated is
        // about charging for a measurement; see docs/invariants.md.
        const wrong = rows.filter((finding) => finding.severity !== 'ok').length

        return (
          <details
            key={group}
            open={wrong > 0}
            className="group space-y-2 break-inside-avoid"
            data-testid="readout-group"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1">
              <span className="panel-label text-[0.6rem] text-muted-foreground">
                {copy.groups[group]}
              </span>
              <span className="font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                {wrong > 0 ? t(copy.groupWrong, { wrong, total: rows.length }) : t(copy.groupOk, { total: rows.length })}
              </span>
            </summary>
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

                  {/* What was written to answer this number, where the number is. The full card,
                      with its steps and its reasoning, is still the one in the tab below -- this is
                      the pointer, not a second copy of it. */}
                  {fixes[finding.id]?.length ? (
                    <p className="text-[0.7rem] leading-snug text-purple" data-testid="finding-fix">
                      {copy.fixLabel} {fixes[finding.id]!.join(' / ')}
                    </p>
                  ) : null}

                  {/* The other page's own number, labelled with its hostname. Not a delta and not a
                      verdict: two pages differ, and nothing here says the difference causes
                      anything. See docs/invariants.md. */}
                  {theirs?.has(finding.id) && (
                    <p className="truncate font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                      {competitorHost}{' '}
                      <span className="text-foreground">
                        {renderValue(theirs.get(finding.id)!, copy, locale)}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
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
