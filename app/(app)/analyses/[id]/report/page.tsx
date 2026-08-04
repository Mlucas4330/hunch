import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { Wordmark } from '@/components/wordmark'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { FlowPlaybook } from '@/components/flow-playbook'
import { Button } from '@/components/ui/button'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { formatDate, t as fill } from '@/lib/i18n/format'
import { hasPlaceholders } from '@/lib/utils'
import { isQuickWin } from '@/lib/constants'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { metadata } = await getDictionary()
  return pageMetadata({
    ...metadata.pages.analysisReport,
    path: `/analyses/${id}/report`,
    index: false
  })
}

export default async function AnalysisReportPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) notFound()

  const analysis = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, user.id)),
    with: {
      hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.position) } } },
      flowFixes: { orderBy: (f, { asc }) => asc(f.position) }
    }
  })

  if (!analysis) notFound()

  const ranked = [...analysis.hypotheses].sort((a, b) => b.impactScore - a.impactScore)
  const quickWins = ranked.filter(isQuickWin).length
  const topImpact = ranked[0]?.impactScore ?? 0
  const locale = await getLocale()
  const t = dictionaryFor(locale)
  const generated = formatDate(new Date(), locale)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/analyses/${analysis.id}`}>{t.report.backToTestIdeas}</Link>
        </Button>
        <p className="panel-label text-[0.65rem] text-muted-foreground">{t.report.printHint}</p>
      </div>

      <header className="flex items-end justify-between gap-4 border-b pb-4">
        <Wordmark />
        <div className="text-right">
          <p className="panel-label text-[0.65rem] text-muted-foreground">{t.report.teardown}</p>
          <p className="font-display text-sm font-medium">{t.report.plan}</p>
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

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        <SummaryCell label={t.report.testsFound} value={String(ranked.length)} />
        <SummaryCell label={t.report.quickWins} value={String(quickWins)} />
        <SummaryCell label={t.report.topImpact} value={`${topImpact}/10`} />
        <SummaryCell label={t.report.generated} value={generated} />
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

      <FlowPlaybook fixes={analysis.flowFixes} />

      <div className="space-y-4">
        {ranked.map((hypothesis, index) => {
          const recommended = hypothesis.variants[0]
          return (
            <article
              key={hypothesis.id}
              className="break-inside-avoid space-y-4 rounded-lg border bg-card p-5"
            >
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
                <p className="text-balance font-display text-base font-semibold leading-snug">
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

              <div className="space-y-1">
                <p className="panel-label text-[0.6rem] text-muted-foreground">
                  {t.report.whyThisWorks}
                </p>
                <p className="text-sm text-muted-foreground">{hypothesis.rationale}</p>
                {recommended?.evidence && (
                  <p className="text-sm text-muted-foreground">{recommended.evidence}</p>
                )}
              </div>
            </article>
          )
        })}
      </div>

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

