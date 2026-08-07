import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Wordmark } from '@/components/wordmark'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { DisclosureCard } from '@/components/disclosure-card'
import { VariantPreview } from '@/components/variant-preview'
import { FlowPlaybook } from '@/components/flow-playbook'
import { AnalysisTabs } from '@/components/analysis-tabs'
import { WaitlistWall } from '@/components/waitlist-wall'
import { WhyBlock } from '@/components/why-block'
import { hasPlaceholders } from '@/lib/utils'
import { MeasuredReadout } from '@/components/measured-readout'
import { readoutFor, splitFixes, splitVisibility } from '@/lib/analyses'
import {
  PLAYBOOK_EXPANDED_COUNT,
  REPORT_FIX_PREVIEW_LIMIT,
  REPORT_PREVIEW_LIMIT
} from '@/lib/constants'
import type { FlowFix } from '@/db/schema'
import type { PlaybookSection } from '@/lib/enums'
import { LanguageToggle } from '@/components/language-toggle'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { loadReport, reportHost, reportIsWhiteLabelled } from '@/lib/report'
import { pageMetadata } from '@/lib/seo'

// noindex: a report is one prospect's teardown behind an opaque key, so it is thin and
// near-duplicate for a crawler. The Open Graph card is the point -- this link is pasted into cold
// email and DMs. An unknown key gets the same metadata shape as a real one, so nothing here reveals
// whether a key exists; the page's own notFound() is what answers a bad link.
export async function generateMetadata({ params }: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await params
  const { metadata } = await getDictionary()
  const analysis = await loadReport(embedKey)

  const vars = {
    host: analysis ? reportHost(analysis.url) : metadata.title,
    count: analysis?.hypotheses.length ?? 0
  }

  return pageMetadata({
    title: fill(metadata.pages.report.title, vars),
    description: fill(metadata.pages.report.description, vars),
    path: `/r/${embedKey}`,
    index: false,
    ownImage: true,
    // An unknown key resolves to false and keeps the branded shape, which is also what stops the
    // metadata from revealing whether a key exists.
    unbranded: reportIsWhiteLabelled(analysis)
  })
}

export default async function PublicReportPage({
  params
}: {
  params: Promise<{ embedKey: string }>
}) {
  const { embedKey } = await params

  const locale = await getLocale()
  const t = dictionaryFor(locale)

  // A prospect reads this from a pasted link, so a mangled key lands on the same 404 an unknown one
  // does rather than a Postgres cast error.
  const analysis = await loadReport(embedKey)
  if (!analysis) notFound()

  // A paid owner's report is a deliverable they hand to their own client: no mark of ours, no
  // "powered by", and nothing behind a wall. A free owner's report is unchanged -- it is our lead
  // magnet, and it is what the paid plan is bought to stop being.
  const whiteLabel = reportIsWhiteLabelled(analysis)

  const ranked = [...analysis.hypotheses].sort((a, b) => b.impactScore - a.impactScore)
  // Fill the preview slots with auto-applicable ideas first (they get a real in-context screenshot),
  // then the rest by impact -- so prospects see genuine previews up top, not manual fallbacks.
  const previewOrder = [
    ...ranked.filter((h) => h.target === 'auto'),
    ...ranked.filter((h) => h.target !== 'auto')
  ]
  // The single gate for all four tabs. A white-labelled report is never cut, and routing every tab
  // through one function is what makes it impossible for one of them to stay walled by accident --
  // the cut used to be written twice, once in fixPanel and once for the copy tab.
  function gate<T>(list: T[], limit: number): { shown: T[]; hidden: T[] } {
    if (whiteLabel) return { shown: list, hidden: [] }
    return { shown: list.slice(0, limit), hidden: list.slice(limit) }
  }

  const { shown: visible, hidden } = gate(previewOrder, REPORT_PREVIEW_LIMIT)
  const topImpact = ranked[0]?.impactScore ?? 0
  const fixes = splitFixes(analysis.flowFixes)
  const visibility = splitVisibility(analysis.flowFixes)
  const reportKey = analysis.embedKey

  // Each tab is gated on its own: the top items in full, then the wall, then the rest blurred behind
  // it. One wall per tab rather than one for the page, because a tab the reader never opens cannot
  // be what asks them for an email.
  function fixPanel(list: FlowFix[], section: PlaybookSection) {
    const { shown, hidden: rest } = gate(list, REPORT_FIX_PREVIEW_LIMIT)

    return (
      <div className="space-y-4">
        <FlowPlaybook fixes={shown} section={section} expandFrom={PLAYBOOK_EXPANDED_COUNT} />
        {rest.length > 0 && (
          <Gated embedKey={reportKey} count={rest.length}>
            {rest.map((fix) => (
              <BlurredRow key={fix.id} title={fix.title} />
            ))}
          </Gated>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4 border-b pb-4">
        {whiteLabel ? <span /> : <Wordmark />}
        <div className="flex items-end gap-4">
          <LanguageToggle locale={locale} />
          <div className="text-right">
            <p className="panel-label text-[0.65rem] text-muted-foreground">{t.report.teardown}</p>
            <p className="font-display text-sm font-medium">{t.report.plan}</p>
          </div>
        </div>
      </header>

      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">
          {t.report.landingPageAnalyzed}
        </p>
        <h1 className="text-balance font-display text-3xl font-bold tracking-tight">
          {fill(t.report.heading, { count: ranked.length })}
        </h1>
        <p className="break-all font-mono text-sm text-purple">{analysis.url}</p>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
        <SummaryCell label={t.report.testsFound} value={String(ranked.length)} />
        <SummaryCell label={t.report.topImpact} value={`${topImpact}/10`} />
      </div>

      {analysis.competitors && analysis.competitors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="panel-label text-[0.65rem] text-muted-foreground">
            {t.report.benchmarkedAgainst}
          </span>
          {analysis.competitors.map((competitor) => (
            <a
              key={competitor.url}
              href={competitor.url}
              className="rounded-full border px-2 py-0.5 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              {competitor.name}
            </a>
          ))}
        </div>
      )}

      {/* Before the tabs and outside every wall. This is the part of the report a stranger can check
          against their own page in one click, so it is what earns the rest of it a reading -- and
          gating a measurement of their own site behind an email would read as a trick. */}
      <MeasuredReadout input={readoutFor(analysis)} />

      <AnalysisTabs
        counts={{
          flow: fixes.flow.length,
          copy: ranked.length,
          seo: visibility.seo.length,
          ai: visibility.ai.length,
          // Never on this surface: a prospect reading someone else's teardown installs no snippet
          // and launches no test. Zero is all it takes -- AnalysisTabs does not render an empty tab.
          tests: 0
        }}
        panels={{
          flow: fixPanel(fixes.flow, 'flow'),
          seo: fixPanel(visibility.seo, 'seo'),
          ai: fixPanel(visibility.ai, 'ai'),
          tests: null,
          copy: (
            <div className="space-y-4">
              {visible.map((hypothesis, index) => {
                const recommended = hypothesis.variants[0]
                return (
                  <DisclosureCard
                    key={hypothesis.id}
                    rank={index + 1}
                    title={hypothesis.problem}
                    testId="hypothesis-card"
                    // Every shown idea starts open here, unlike the owner's screen: this is the
                    // outreach surface, and a prospect who has to click to see anything sees
                    // nothing. Closing one is still how they get it out of the way.
                    defaultOpen
                    badge={
                      <span className="flex shrink-0 items-center gap-1.5">
                        <SectionBadge section={hypothesis.section} />
                        {index === 0 && (
                          <span className="panel-label text-[0.6rem] text-coral">
                            {t.report.testThisFirst}
                          </span>
                        )}
                      </span>
                    }
                    scores={
                      <>
                        <ScoreIndicator
                          score={hypothesis.impactScore}
                          kind="impact"
                          variant="compact"
                        />
                        <ScoreIndicator
                          score={hypothesis.effortScore}
                          kind="effort"
                          variant="compact"
                        />
                      </>
                    }
                    openScores={
                      <>
                        <ScoreIndicator score={hypothesis.impactScore} kind="impact" />
                        <ScoreIndicator score={hypothesis.effortScore} kind="effort" />
                      </>
                    }
                  >
                    {recommended && (
                      <div className="space-y-2">
                        <p className="panel-label text-[0.6rem] text-muted-foreground">
                          {t.report.recommendation}
                        </p>
                        <div className="space-y-3 rounded-md border border-purple/40 bg-purple/10 p-3">
                          <div className="space-y-1">
                            <p className="panel-label text-[0.55rem] text-muted-foreground">
                              {t.report.current}
                            </p>
                            <p className="text-sm text-muted-foreground line-through">
                              {hypothesis.currentCopy}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="panel-label text-[0.55rem] text-muted-foreground">
                              {t.report.changeTo}
                            </p>
                            <p className="text-sm font-medium">{recommended.copy}</p>
                          </div>
                        </div>
                        {hasPlaceholders(recommended.copy) && (
                          <p className="font-mono text-xs text-amber">{t.report.placeholderNote}</p>
                        )}
                      </div>
                    )}

                    {hypothesis.target === 'auto' ? (
                      <VariantPreview
                        embedKey={analysis.embedKey}
                        hypothesisId={hypothesis.id}
                        initialUrl={recommended?.screenshotUrl ?? null}
                      />
                    ) : (
                      <div className="rounded-md border border-dashed bg-muted/40 p-3">
                        <p className="panel-label text-[0.6rem] text-muted-foreground">
                          {t.report.manualSetup}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.report.manualSetupBody}
                        </p>
                      </div>
                    )}

                    {/* Open, not folded into a 9.6px summary. This is the argument for the change
                        the prospect is being asked to believe. */}
                    <WhyBlock label={t.report.whyThisWorks}>
                      <p>{hypothesis.rationale}</p>
                      {recommended?.evidence && <p>{recommended.evidence}</p>}
                    </WhyBlock>
                  </DisclosureCard>
                )
              })}

              {hidden.length > 0 && (
                <Gated embedKey={analysis.embedKey} count={hidden.length}>
                  {hidden.map((hypothesis) => (
                    <BlurredRow
                      key={hypothesis.id}
                      title={hypothesis.problem}
                      badge={<SectionBadge section={hypothesis.section} />}
                    />
                  ))}
                </Gated>
              )}
            </div>
          )
        }}
      />

      {/* Both halves are ours: one asks the reader to run a live test with us, the other signs the
          document. Neither belongs in a report an agency presents to its own client. */}
      {!whiteLabel && (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <p className="font-mono text-sm">{t.report.footerQuestion}</p>
          <p className="text-sm text-muted-foreground">{t.report.generatedBy}</p>
        </footer>
      )}
    </div>
  )
}

function Gated({
  embedKey,
  count,
  children
}: {
  embedKey: string
  count: number
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <WaitlistWall embedKey={embedKey} hiddenCount={count} />
      <div aria-hidden className="pointer-events-none select-none space-y-4 blur-sm">
        {children}
      </div>
    </div>
  )
}

// Deliberately carries no data-testid: the counts in the e2e suite mean "items actually shown", and
// a blurred placeholder is neither readable nor countable as one.
function BlurredRow({ title, badge }: { title: string; badge?: ReactNode }) {
  return (
    <article className="space-y-3 rounded-lg border bg-card p-5">
      {badge && <div className="flex items-center gap-2">{badge}</div>}
      <p className="font-display text-base font-semibold leading-snug">{title}</p>
      <div className="h-16 rounded-md border border-purple/40 bg-purple/10" />
    </article>
  )
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4">
      <p className="panel-label text-[0.6rem] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
