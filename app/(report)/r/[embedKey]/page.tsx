
import { notFound } from 'next/navigation'
import { ReportCover } from '@/components/report-cover'
import { Wordmark } from '@/components/wordmark'
import { UnlockWall } from '@/components/unlock-wall'
import { HypothesisCard } from '@/components/hypothesis-card'
import { VariantPreview } from '@/components/variant-preview'
import { FlowPlaybook } from '@/components/flow-playbook'
import { AnalysisTabs } from '@/components/analysis-tabs'
import { WhyBlock } from '@/components/why-block'
import { hasPlaceholders } from '@/lib/utils'
import { MeasuredReadout } from '@/components/measured-readout'
import { loadReport, readoutFor, splitFixes, splitVisibility } from '@/lib/analyses'
import { PLAYBOOK_EXPANDED_COUNT } from '@/lib/constants'
import type { FlowFix } from '@/db/schema'
import type { PlaybookSection } from '@/lib/enums'
import { LanguageToggle } from '@/components/language-toggle'
import { dictionaryFor, getDictionary, getLocale, type Dictionary } from '@/lib/i18n'
import { formatDate, t as fill } from '@/lib/i18n/format'
import { displayHost } from '@/lib/host'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await params
  const { metadata } = await getDictionary()
  const analysis = await loadReport(embedKey)

  const vars = {
    host: analysis ? displayHost(analysis.url) : metadata.title,
    count: analysis?.hypotheses.length ?? 0
  }

  return pageMetadata({
    title: fill(metadata.pages.report.title, vars),
    description: fill(metadata.pages.report.description, vars),
    path: `/r/${embedKey}`,
    index: false,
    ownImage: true
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

  const analysis = await loadReport(embedKey)
  if (!analysis) notFound()

  // Three shapes now, and they are the free/paid cut made visible.
  //
  // 1. Nothing measured yet: the job is still on the queue. The form waits for this before it
  //    navigates, so a reader only lands here by opening the link early or reloading mid-run.
  // 2. Measured, nothing generated: an anonymous analysis. Score and readout in full, then the wall.
  // 3. Generated: the whole document.
  //
  // The readout is never gated in any of them, for the reason in docs/readout.md.
  const measured = analysis.structure !== null
  const generated = analysis.hypotheses.length > 0

  if (!measured) return <MeasuringNotice t={t} url={analysis.url} />

  const ranked = [...analysis.hypotheses].sort((a, b) => b.impactScore - a.impactScore)
  const previewOrder = [
    ...ranked.filter((h) => h.target === 'auto'),
    ...ranked.filter((h) => h.target !== 'auto')
  ]
  const visible = previewOrder
  const fixes = splitFixes(analysis.flowFixes)
  const visibility = splitVisibility(analysis.flowFixes)
  const counts = {
    changes: ranked.length + analysis.flowFixes.length,
    ready: ranked.filter((hypothesis) => hypothesis.target === 'auto').length,
    structural: analysis.flowFixes.length
  }

  function fixPanel(list: FlowFix[], section: PlaybookSection) {
    return <FlowPlaybook fixes={list} section={section} expandFrom={PLAYBOOK_EXPANDED_COUNT} />
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <Wordmark />
        <div className="flex items-end gap-4">
          <LanguageToggle locale={locale} />
          <div className="text-right">
            <p className="panel-label text-[0.65rem] text-muted-foreground">{t.report.teardown}</p>
            <p className="font-display text-sm font-medium">{t.report.plan}</p>
          </div>
        </div>
      </header>

      <ReportCover
        t={t}
        url={analysis.url}
        generated={formatDate(analysis.createdAt, locale)}
        counts={generated ? counts : null}
      />

      {/* Both cells count generated work, so on a measured-only report both would read 0 -- a page
          scored 47 sitting under "Changes recommended: 0". The strip is left out entirely rather
          than shown empty; the score and the readout below are the whole of what was measured. */}
      {generated && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
          <SummaryCell label={t.report.changesFound} value={String(counts.changes)} />
          <SummaryCell label={t.report.copyWritten} value={String(counts.ready)} />
        </div>
      )}

      <MeasuredReadout input={readoutFor(analysis)} />

      {generated ? (
        <AnalysisTabs
          counts={{
            flow: fixes.flow.length,
            copy: ranked.length,
            seo: visibility.seo.length,
            ai: visibility.ai.length
          }}
          panels={{
            flow: fixPanel(fixes.flow, 'flow'),
            seo: fixPanel(visibility.seo, 'seo'),
            ai: fixPanel(visibility.ai, 'ai'),
            copy: (
              <div className="space-y-4">
                {visible.map((hypothesis, index) => {
                  const recommended = hypothesis.variants[0]
                  return (
                    <HypothesisCard
                      key={hypothesis.id}
                      hypothesis={hypothesis}
                      rank={index + 1}
                      isTop={index === 0}
                      defaultOpen
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
                          initialOverflow={recommended?.screenshotOverflow ?? false}
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

                      <WhyBlock label={t.report.whyThisWorks}>
                        <p>{hypothesis.rationale}</p>
                        {recommended?.evidence && <p>{recommended.evidence}</p>}
                      </WhyBlock>
                    </HypothesisCard>
                  )
                })}

              </div>
            )
          }}
        />
      ) : (
        <UnlockWall embedKey={embedKey} />
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <p className="font-mono text-sm">{t.report.footerQuestion}</p>
        <p className="text-sm text-muted-foreground">{t.report.generatedBy}</p>
      </footer>
    </div>
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

function MeasuringNotice({ t, url }: { t: Dictionary; url: string }) {
  return (
    <div className="space-y-4" data-testid="measuring">
      <p className="panel-label text-[0.7rem] text-muted-foreground">{t.report.teardown}</p>
      <h1 className="text-balance font-display text-2xl font-bold tracking-tight">
        {t.report.measuringHeading}
      </h1>
      <p className="break-all font-mono text-sm text-muted-foreground">{url}</p>
      <p className="max-w-xl text-sm text-muted-foreground">{t.report.measuringBody}</p>
      <div className="h-40 w-full animate-pulse rounded-md border bg-muted" aria-busy="true" />
    </div>
  )
}
