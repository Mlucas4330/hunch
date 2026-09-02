'use client'

import type { CSSProperties } from 'react'
import {
  Bot,
  FileCode,
  Gauge,
  LayoutTemplate,
  ShieldCheck,
  Smartphone,
  type LucideIcon
} from 'lucide-react'
import { DisclosureCard } from '@/components/disclosure-card'
import { InfoHint } from '@/components/info-hint'
import { ReadoutScore } from '@/components/readout-score'
import { ReadoutTrend } from '@/components/readout-trend'
import { RichText } from '@/components/rich-text'
import { SectionLink } from '@/components/section-link'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/components/i18n-provider'
import { competitorValues } from '@/lib/competitor'
import {
  BYTES_PER_MEGABYTE,
  fixAnchor,
  MS_PER_SECOND,
  READOUT_SEVERITY_CLASS
} from '@/lib/constants'
import { READOUT_GROUP } from '@/lib/enums'
import { formatDecimal, formatNumber, t } from '@/lib/i18n/format'
import {
  hasReadout,
  readout,
  type MeasuredFinding,
  type ReadoutInput
} from '@/lib/readout'
import { readoutScore, scoreSeverity } from '@/lib/score'
import { deltas, type ScorePoint } from '@/lib/snapshots'
import type { Locale, ReadoutFinding, ReadoutGroup, ReadoutUnit } from '@/lib/enums'
import { cn } from '@/lib/utils'

/**
 * One glyph per group, beside the severity badge on that group's card.
 *
 * **It lives here rather than in `lib/constants.ts`, against the precedent of every other readout
 * map.** Those are strings, and `lib/readout.ts` and `lib/score.ts` import that file while staying
 * pure -- a React component in it would drag lucide into both. This is a rendering decision and it
 * belongs beside the only thing that renders it.
 */
const READOUT_GROUP_ICON: Record<ReadoutGroup, LucideIcon> = {
  structure: LayoutTemplate,
  credibility: ShieldCheck,
  mobile: Smartphone,
  declared: FileCode,
  crawler_access: Bot,
  load: Gauge
}

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
   *
   * **The id travels with the title so the pointer can be a link.** It was the title alone, printed
   * as text: the reader was told the name of the card that answers this number and then had to find
   * it themselves, several sections down, inside a panel that may be closed. Naming a destination
   * without offering it is most of the way to not having one.
   */
  fixes?: Partial<Record<ReadoutFinding, { id: string; title: string }[]>>
  className?: string
}) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout
  const measured = readout(input)
  const moved = deltas(input, previous)
  const theirs = competitor ? competitorValues(competitor, measured.findings) : null
  const score = readoutScore(measured.findings)

  if (!hasReadout(measured)) return null

  return (
    <section className={cn('space-y-4', className)} data-testid="measured-readout">
      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{copy.eyebrow}</p>
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

      {/* **One `DisclosureCard` per group, with the group's score down the left edge.** This was six
          flat grids of equal-weight cells under six small labels, which read as a spreadsheet:
          nothing separated "What the page costs to open" from "First content painted", so the
          section could not be scanned at the level of groups at all.

          The rail is the same shell the ranked fix cards use, on purpose -- a column of numbers down
          the left is how this report says "here is a thing with a score on it", and having two
          answers to that on one page was the actual inconsistency. It is **not** the same widget:
          `ScoreIndicator` is the 1-10 impact scale and this is 0-100 health, so each rail prints its
          own denominator and takes its colour from its own map. See docs/readout.md.

          `items-start` is load-bearing: grid items stretch to the tallest in their row by default, so
          opening one card grew the empty box of the one beside it. Each card is now its own height.

          **Which is why the closed cards are levelled at their content instead of at the grid.** They
          were arriving at different heights, and the tempting fix -- dropping `items-start` -- is the
          bug above coming back. Two things differed: whether the group's name wrapped to a second
          line, and whether the severity badge was long enough to push the count beside it onto one.
          Reserving the column covers both, and the grid is still told to stretch nothing. See
          `summaryClassName` on DisclosureCard. */}
      <div className="grid items-start gap-4 md:grid-cols-2">
        {READOUT_GROUP.map((group, index) => {
          const rows = measured.findings.filter((finding) => finding.group === group)
          const value = score.groups[group]
          if (rows.length === 0 || value === null) return null

          // **A group whose every check passed opens closed, and that is disclosure, not gating.**
          // The whole readout used to render expanded at once -- 41 findings across six grids, and
          // four in five of them saying nothing is wrong -- so the rows that needed attention were
          // buried among the rows that did not. Nothing here is behind a payment or a session: same
          // reader, one click, and the count is on the summary either way. The rule that the readout
          // is never gated is about charging for a measurement; see docs/invariants.md.
          const wrong = rows.filter((finding) => finding.severity !== 'ok').length
          const severity = scoreSeverity(value)
          const Icon = READOUT_GROUP_ICON[group]

          return (
            <DisclosureCard
              key={group}
              title={copy.groups[group]}
              // Enough room reserved for the worst of the six: a two line group name under a
              // severity badge long enough ("Precisa de trabalho") to push the count onto a second
              // line beside it. A minimum rather than a clamp, so a locale that needs more grows
              // instead of clipping. See the note on the grid below.
              summaryClassName="min-h-36"
              defaultOpen={wrong > 0}
              testId="readout-group"
              // `index` is the group's position in READOUT_GROUP, not its position among the cards
              // that survived the filter above. That is the right one: the delay should follow the
              // fixed reading order of the groups, so a report missing one group does not restagger
              // the rest into a different rhythm than the report beside it.
              className="animate-stagger-in"
              style={{ '--index': index } as CSSProperties}
              score={
                <span
                  className={cn(
                    'flex w-14 shrink-0 flex-col items-center justify-center border-r font-mono tabular-nums',
                    READOUT_SEVERITY_CLASS[severity]
                  )}
                  aria-label={t(copy.score.railAria, { score: value })}
                >
                  <span className="text-xl font-semibold leading-none">{value}</span>
                  {/* The denominator is what keeps this from reading as the 1-10 impact rail three
                      cards further down the same page. */}
                  <span className="text-micro leading-none opacity-70" aria-hidden>
                    /100
                  </span>
                </span>
              }
              badge={
                <>
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <Badge className={READOUT_SEVERITY_CLASS[severity]}>
                    {copy.score.severity[severity]}
                  </Badge>
                  <span className="font-mono text-micro tabular-nums text-muted-foreground">
                    {wrong > 0
                      ? t(copy.groupWrong, { wrong, total: rows.length })
                      : t(copy.groupOk, { total: rows.length })}
                  </span>
                </>
              }
            >
              <div className="divide-y">
                {rows.map((finding) => (
                  <div
                    key={finding.id}
                    className="space-y-1 py-2.5 first:pt-0 last:pb-0"
                    data-testid="readout-finding"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs leading-snug text-muted-foreground">
                          {copy.findings[finding.id]}
                        </p>
                        {/* **What the check itself does, so a bare number says which way to move.**
                            "6" is not actionable until the reader knows whether six is four too many
                            or two too few, and the severity colour says something is wrong without
                            saying what. This states our own boundary and predicts nothing -- it may
                            never grow into what the number costs. See docs/readout.md. */}
                        {finding.criterion && (
                          <p className="font-mono text-micro leading-snug text-muted-foreground/70">
                            {renderCriterion(finding, copy, locale)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-baseline gap-1.5">
                        <p
                          className={cn(
                            'inline-block rounded px-1.5 py-0.5 font-display text-base font-semibold tabular-nums',
                            READOUT_SEVERITY_CLASS[finding.severity]
                          )}
                        >
                          {renderValue(finding, copy, locale)}
                        </p>
                        {moved.has(finding.id) && (
                          <span className="font-mono text-micro tabular-nums text-muted-foreground">
                            {renderDelta(moved.get(finding.id) ?? 0, finding.unit, copy, locale)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* What was written to answer this number, where the number is. The full card,
                        with its steps and its reasoning, is still the one in the tab below -- this
                        is the pointer, not a second copy of it. */}
                    {fixes[finding.id]?.length ? (
                      <p className="text-micro leading-snug text-purple" data-testid="finding-fix">
                        {copy.fixLabel}{' '}
                        {fixes[finding.id]!.map((fix, index) => (
                          <span key={fix.id}>
                            {index > 0 && <span aria-hidden> / </span>}
                            <SectionLink
                              target={fixAnchor(fix.id)}
                              className="underline decoration-purple/40 underline-offset-2 hover:decoration-purple"
                            >
                              {fix.title}
                            </SectionLink>
                          </span>
                        ))}
                      </p>
                    ) : null}

                    {/* The other page's own number, labelled with its hostname. Not a delta and
                        not a verdict: two pages differ, and nothing here says the difference
                        causes anything. See docs/invariants.md. */}
                    {theirs?.has(finding.id) && (
                      <p className="truncate font-mono text-micro tabular-nums text-muted-foreground">
                        {competitorHost}{' '}
                        <span className="text-foreground">
                          {renderValue(theirs.get(finding.id)!, copy, locale)}
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </DisclosureCard>
          )
        })}
      </div>
    </section>
  )
}

type ReadoutCopy = ReturnType<typeof useI18n>['dictionary']['readout']

function renderValue(finding: MeasuredFinding, copy: ReadoutCopy, locale: Locale): string {
  const rendered = renderUnit(finding.value, finding.unit, copy, locale)

  // **The `at least` qualifier belongs to the measured value and to nothing else.** It is there
  // because SCRAPE_ALLOWED_RESOURCE_TYPES blocks media, so the bytes counted are a floor -- see
  // docs/invariants.md. It used to live inside `renderUnit`, which meant the delta also read "+at
  // least 0.3 MB", and now the threshold beside it would have read "at least 2 MB" as if our own
  // boundary were approximate.
  return finding.unit === 'megabytes' ? `${copy.atLeast} ${rendered}` : rendered
}

// The boundary the finding was judged against, in the finding's own unit. `criterion.kind` is the
// dictionary key, so a kind added to READOUT_CRITERION_KIND without a string fails typecheck.
function renderCriterion(
  finding: MeasuredFinding,
  copy: ReadoutCopy,
  locale: Locale
): string | null {
  if (!finding.criterion) return null

  return t(copy.criterion[finding.criterion.kind], {
    value: renderUnit(finding.criterion.threshold, finding.unit, copy, locale)
  })
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
    case 'megabytes':
      return t(copy.units.megabytes, {
        value: formatDecimal(value / BYTES_PER_MEGABYTE, locale, 1)
      })
    default:
      return formatNumber(value, locale)
  }
}
