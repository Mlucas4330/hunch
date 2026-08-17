import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { HypothesisList } from '@/components/hypothesis-list'
import { FlowPlaybook } from '@/components/flow-playbook'
import { AnalysisTabs } from '@/components/analysis-tabs'
import { NextStage } from '@/components/next-stage'
import { InfoHint } from '@/components/info-hint'
import { ReportDeliverables } from '@/components/report-deliverables'
import { UpgradePrompt } from '@/components/upgrade-prompt'
import { RichText } from '@/components/rich-text'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { MeasuredReadout } from '@/components/measured-readout'
import { MeasurePage } from '@/components/measure-page'
import { readoutFor, readoutHistory, splitFixes, splitVisibility } from '@/lib/analyses'
import { hasReadout, readout } from '@/lib/readout'
import { PLAYBOOK_EXPANDED_COUNT } from '@/lib/constants'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.analysis, path: `/analyses/${id}`, index: false })
}

export default async function AnalysisDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) notFound()

  const t = await getDictionary()

  const analysis = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, user.id)),
    with: {
      hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.position) } } },
      flowFixes: { orderBy: (f, { asc }) => asc(f.position) }
    }
  })

  if (!analysis) notFound()

  const fixes = splitFixes(analysis.flowFixes)
  const visibility = splitVisibility(analysis.flowFixes)
  const testable = analysis.hypotheses.filter((hypothesis) => hypothesis.target === 'auto')
  const measured = hasReadout(readout(readoutFor(analysis)))
  const history = measured ? await readoutHistory(analysis.id) : { previous: null, scores: [] }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">{t.analysis.eyebrow}</p>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">{t.analysis.title}</h1>
            <InfoHint label={t.analysis.hintLabel}>
              <RichText>{t.analysis.hint}</RichText>
            </InfoHint>
          </div>
          <p className="truncate font-mono text-sm text-muted-foreground">{analysis.url}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">{t.analysis.backToDashboard}</Link>
          </Button>
        </div>
      </div>

      {analysis.competitors && analysis.competitors.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="benchmarked-against">
          {t.analysis.benchmarkedAgainst}{' '}
          {analysis.competitors.map((competitor, i) => (
            <span key={competitor.url}>
              {i > 0 && ', '}
              <a
                href={competitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {competitor.name}
              </a>
            </span>
          ))}
          <span className="text-muted-foreground">
            {' '}
            {fill(t.analysis.marketNote, { market: t.labels.market[analysis.market] })}
          </span>
        </p>
      )}

      <ReportDeliverables
        reportUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
        embedKey={analysis.embedKey}
        analysisId={analysis.id}
      />

      {measured ? (
        <div className="space-y-4">
          <MeasuredReadout
            input={readoutFor(analysis)}
            previous={history.previous}
            scores={history.scores}
          />
          <MeasurePage analysisId={analysis.id} variant="again" />
        </div>
      ) : (
        <MeasurePage analysisId={analysis.id} />
      )}

      <AnalysisTabs
        counts={{
          flow: fixes.flow.length,
          copy: analysis.hypotheses.length,
          seo: visibility.seo.length,
          ai: visibility.ai.length
        }}
        panels={{
          flow: <FlowPlaybook fixes={fixes.flow} expandFrom={PLAYBOOK_EXPANDED_COUNT} />,
          copy: <HypothesisList hypotheses={analysis.hypotheses} />,
          seo: (
            <FlowPlaybook
              fixes={visibility.seo}
              section="seo"
              expandFrom={PLAYBOOK_EXPANDED_COUNT}
            />
          ),
          ai: (
            <FlowPlaybook fixes={visibility.ai} section="ai" expandFrom={PLAYBOOK_EXPANDED_COUNT} />
          )
        }}
      />

      <NextStage t={t} analysisId={analysis.id} testable={testable.length} />

      {user.plan === 'free' && <UpgradePrompt />}
    </div>
  )
}
