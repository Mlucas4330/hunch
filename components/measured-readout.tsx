'use client'

import type { CSSProperties } from 'react'
import {
  Bot,
  FileCode,
  Gauge,
  LayoutTemplate,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
  Copy
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
import { fixAnchor, READOUT_SEVERITY_CLASS } from '@/lib/constants'
import { READOUT_GROUP } from '@/lib/enums'
import { t } from '@/lib/i18n/format'
import { readoutUnit, readoutValue, type ReadoutCopy } from '@/lib/readout-format'
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
  load: Gauge,
  sameness: Copy
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
   * **A third axis, and the one that stops this being a list the reader has to join by hand.** The
   * report shows 43 counted tiles here and up to 20 generated cards in the tabs below; without this,
   * "form has 7 fields" and "cut the form to three" are two paragraphs the reader has to recognise
   * as the same subject.
   *
   * A plain object rather than a Map because it crosses the server boundary. Empty for every analysis
   * with nothing generated -- which is every free one -- and that is what keeps this from becoming a
   * paywall tease inside the one section that is never gated. See docs/invariants.md.
   *
   * **The id travels with the title so the pointer can be a link.** The title alone, printed as
   * text, tells the reader the name of the card that answers this number and then leaves them to
   * find it several sections down inside a panel that may be closed. Naming a destination without
   * offering it is most of the way to not having one.
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

          **One column at every width, and the six groups are why.** Two columns put the group a
          reader is opening beside a closed one, so the eye has to work out which of two rails the
          panel below belongs to, and a card opened in the left column pushed its neighbour's
          content down the screen for no reason the reader can see. In one column the rail, the name
          and the findings are the same object every time, and nothing a click does happens beside
          the thing that was clicked. It costs scrolling, which is what a report is read with. */}
      <div className="grid gap-4">
        {READOUT_GROUP.map((group, index) => {
          const rows = measured.findings.filter((finding) => finding.group === group)
          const value = score.groups[group]
          // **The guard is on rows alone, and it used to be on the score too.** An unscored group
          // has a null score by design -- see UNSCORED_READOUT_GROUP -- so testing it here deleted
          // the whole card rather than the rail. What a missing score removes is the `/100` and the
          // severity that hangs off it, and nothing else. See docs/readout.md.
          if (rows.length === 0) return null

          const unscored = value === null

          // **A group whose every check passed opens closed, and that is disclosure, not gating.**
          // Rendering the whole readout expanded means 41 findings across six grids with four in
          // five of them saying nothing is wrong, burying the rows that need attention among the
          // rows that do not. Nothing here is behind a payment or a session: same
          // reader, one click, and the count is on the summary either way. The rule that the readout
          // is never gated is about charging for a measurement; see docs/invariants.md.
          const wrong = rows.filter((finding) => finding.severity !== 'ok').length
          const severity = unscored ? null : scoreSeverity(value)
          const Icon = READOUT_GROUP_ICON[group]

          return (
            <DisclosureCard
              key={group}
              title={copy.groups[group]}
              // **Open by default when the group grades nothing.** `wrong > 0` is the right test for
              // a group of checks: it opens the ones with something to answer for. An unscored group
              // has no wrong rows by construction, so that test would close it forever -- and it is
              // the section this audience came to read.
              defaultOpen={unscored || wrong > 0}
              testId="readout-group"
              // `index` is the group's position in READOUT_GROUP, not its position among the cards
              // that survived the filter above. That is the right one: the delay should follow the
              // fixed reading order of the groups, so a report missing one group does not restagger
              // the rest into a different rhythm than the report beside it.
              className="animate-stagger-in"
              style={{ '--index': index } as CSSProperties}
              score={
                severity === null ? undefined : (
                  <span
                    className={cn(
                      'flex w-14 shrink-0 flex-col items-center justify-center border-r font-mono tabular-nums',
                      READOUT_SEVERITY_CLASS[severity]
                    )}
                    aria-label={t(copy.score.railAria, { score: value ?? 0 })}
                  >
                    <span className="text-xl font-semibold leading-none">{value}</span>
                    {/* The denominator is what keeps this from reading as the 1-10 impact rail three
                        cards further down the same page. */}
                    <span className="text-micro leading-none opacity-70" aria-hidden>
                      /100
                    </span>
                  </span>
                )
              }
              badge={
                <>
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {severity !== null && (
                    <Badge className={READOUT_SEVERITY_CLASS[severity]}>
                      {copy.score.severity[severity]}
                    </Badge>
                  )}
                  <span className="font-mono text-micro tabular-nums text-muted-foreground">
                    {/* Three sentences for three shapes: marks present out of marks looked for,
                        checks needing attention, and checks all passing. The first says nothing
                        about good or bad, which is the whole contract of an unscored group. */}
                    {severity === null
                      ? t(copy.groupMarks, {
                          present: rows.filter((finding) => finding.value > 0).length,
                          total: rows.length
                        })
                      : wrong > 0
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
                          {readoutValue(finding, copy, locale)}
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
                          {readoutValue(theirs.get(finding.id)!, copy, locale)}
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

// The boundary the finding was judged against, in the finding's own unit. `criterion.kind` is the
// dictionary key, so a kind added to READOUT_CRITERION_KIND without a string fails typecheck.
function renderCriterion(
  finding: MeasuredFinding,
  copy: ReadoutCopy,
  locale: Locale
): string | null {
  if (!finding.criterion) return null

  return t(copy.criterion[finding.criterion.kind], {
    value: readoutUnit(finding.criterion.threshold, finding.unit, copy, locale)
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

  const size = readoutUnit(Math.abs(delta), unit, copy, locale)
  return t(delta > 0 ? copy.delta.up : copy.delta.down, { value: size })
}

