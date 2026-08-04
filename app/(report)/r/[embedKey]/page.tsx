import { notFound } from 'next/navigation'
import { Wordmark } from '@/components/wordmark'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { VariantPreview } from '@/components/variant-preview'
import { FlowPlaybook } from '@/components/flow-playbook'
import { WaitlistWall } from '@/components/waitlist-wall'
import { hasPlaceholders } from '@/lib/utils'
import { PLAYBOOK_EXPANDED_COUNT, REPORT_PREVIEW_LIMIT } from '@/lib/constants'
import { LanguageToggle } from '@/components/language-toggle'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { loadReport, reportHost } from '@/lib/report'
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

  // A prospect reads this from a pasted link, so a mangled key lands on the same 404 an unknown one
  // does rather than a Postgres cast error.
  const analysis = await loadReport(embedKey)
  if (!analysis) notFound()

  const ranked = [...analysis.hypotheses].sort((a, b) => b.impactScore - a.impactScore)
  // Fill the preview slots with auto-applicable ideas first (they get a real in-context screenshot),
  // then the rest by impact -- so prospects see genuine previews up top, not manual fallbacks.
  const previewOrder = [
    ...ranked.filter((h) => h.target === 'auto'),
    ...ranked.filter((h) => h.target !== 'auto')
  ]
  const visible = previewOrder.slice(0, REPORT_PREVIEW_LIMIT)
  const hidden = previewOrder.slice(REPORT_PREVIEW_LIMIT)
  const topImpact = ranked[0]?.impactScore ?? 0

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4 border-b pb-4">
        <Wordmark />
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

      {/* Shown in full, in front of the wall and outside REPORT_PREVIEW_LIMIT: the flow fixes are
          the strongest reason a prospect keeps reading, so they are never what gets blurred. */}
      <FlowPlaybook fixes={analysis.flowFixes} expandFrom={PLAYBOOK_EXPANDED_COUNT} />

      <div className="space-y-4">
        {visible.map((hypothesis, index) => {
          const recommended = hypothesis.variants[0]
          return (
            <article key={hypothesis.id} className="space-y-4 rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <SectionBadge section={hypothesis.section} />
                  {index === 0 && (
                    <span className="panel-label text-[0.6rem] text-coral">
                      {t.report.testThisFirst}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <ScoreIndicator score={hypothesis.impactScore} kind="impact" />
                  <ScoreIndicator score={hypothesis.effortScore} kind="effort" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="panel-label text-[0.6rem] text-muted-foreground">{t.report.problem}</p>
                <p className="text-sm font-medium leading-snug text-foreground">
                  {hypothesis.problem}
                </p>
              </div>

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
                  <p className="mt-1 text-xs text-muted-foreground">{t.report.manualSetupBody}</p>
                </div>
              )}

              <details className="group">
                <summary className="panel-label flex cursor-pointer list-none items-center gap-1 text-[0.6rem] text-muted-foreground hover:text-foreground">
                  {t.report.whyThisWorks}
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">-</span>
                </summary>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-muted-foreground">{hypothesis.rationale}</p>
                  {recommended?.evidence && (
                    <p className="text-sm text-muted-foreground">{recommended.evidence}</p>
                  )}
                </div>
              </details>
            </article>
          )
        })}
      </div>

      {hidden.length > 0 && (
        <div className="space-y-4">
          <WaitlistWall embedKey={analysis.embedKey} hiddenCount={hidden.length} />
          <div
            aria-hidden
            className="pointer-events-none select-none space-y-4 blur-sm"
          >
            {hidden.map((hypothesis, index) => (
              <article key={hypothesis.id} className="space-y-3 rounded-lg border bg-card p-5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {String(REPORT_PREVIEW_LIMIT + index + 1).padStart(2, '0')}
                  </span>
                  <SectionBadge section={hypothesis.section} />
                </div>
                <p className="font-display text-base font-semibold leading-snug">
                  {hypothesis.problem}
                </p>
                <div className="h-16 rounded-md border border-purple/40 bg-purple/10" />
              </article>
            ))}
          </div>
        </div>
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
