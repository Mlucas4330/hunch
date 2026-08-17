import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { ReportBrandMark } from '@/components/report-brand-mark'
import { ReportCover } from '@/components/report-cover'
import { SectionBadge } from '@/components/section-badge'
import { HypothesisCard } from '@/components/hypothesis-card'
import { VariantPreview } from '@/components/variant-preview'
import { FlowPlaybook } from '@/components/flow-playbook'
import { AnalysisTabs } from '@/components/analysis-tabs'
import { WaitlistWall } from '@/components/waitlist-wall'
import { ReportViewPing } from '@/components/report-view-ping'
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
import { formatDate, t as fill } from '@/lib/i18n/format'
import { displayHost } from '@/lib/host'
import { loadReport, reportBrand } from '@/lib/report'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await params
  const { metadata } = await getDictionary()
  const analysis = await loadReport(embedKey)
  const brand = reportBrand(analysis)

  const vars = {
    host: analysis ? displayHost(analysis.url) : metadata.title,
    count: analysis?.hypotheses.length ?? 0
  }

  return pageMetadata({
    title: fill(metadata.pages.report.title, vars),
    description: fill(metadata.pages.report.description, vars),
    path: `/r/${embedKey}`,
    index: false,
    ownImage: true,
    unbranded: brand.whiteLabel,
    brandName: brand.name
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

  const brand = reportBrand(analysis)
  const whiteLabel = brand.whiteLabel

  const ranked = [...analysis.hypotheses].sort((a, b) => b.impactScore - a.impactScore)
  const previewOrder = [
    ...ranked.filter((h) => h.target === 'auto'),
    ...ranked.filter((h) => h.target !== 'auto')
  ]
  function gate<T>(list: T[], limit: number): { shown: T[]; hidden: T[] } {
    if (whiteLabel) return { shown: list, hidden: [] }
    return { shown: list.slice(0, limit), hidden: list.slice(limit) }
  }

  const { shown: visible, hidden } = gate(previewOrder, REPORT_PREVIEW_LIMIT)
  const fixes = splitFixes(analysis.flowFixes)
  const visibility = splitVisibility(analysis.flowFixes)
  const reportKey = analysis.embedKey
  const counts = {
    changes: ranked.length + analysis.flowFixes.length,
    ready: ranked.filter((hypothesis) => hypothesis.target === 'auto').length,
    structural: analysis.flowFixes.length
  }

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
      <ReportViewPing embedKey={embedKey} />
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <ReportBrandMark brand={brand} />
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
        brand={brand}
        url={analysis.url}
        generated={formatDate(analysis.createdAt, locale)}
        counts={counts}
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
        <SummaryCell label={t.report.changesFound} value={String(counts.changes)} />
        <SummaryCell label={t.report.copyWritten} value={String(counts.ready)} />
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

      <MeasuredReadout input={readoutFor(analysis)} />

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
