import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { HypothesisList } from '@/components/hypothesis-list'
import { FlowPlaybook } from '@/components/flow-playbook'
import { AnalysisTabs } from '@/components/analysis-tabs'
import { TestList } from '@/components/test-list'
import { InfoHint } from '@/components/info-hint'
import { CopyReportLink } from '@/components/copy-report-link'
import { UpgradePrompt } from '@/components/upgrade-prompt'
import { RichText } from '@/components/rich-text'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { MeasuredReadout } from '@/components/measured-readout'
import { readoutFor, splitFixes, splitVisibility } from '@/lib/analyses'
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
  // Only `auto` ideas can run as a live test: the snippet swaps one element's text, so a `manual`
  // idea has nothing for it to target. An analysis where every idea is manual has no Tests tab at
  // all -- and no snippet card, which there would be nothing to install.
  const testable = analysis.hypotheses.filter((hypothesis) => hypothesis.target === 'auto')

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-start justify-between gap-4">
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
        <div className="flex shrink-0 items-center gap-2">
          <CopyReportLink
            reportUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
            embedKey={analysis.embedKey}
            analysisId={analysis.id}
          />
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
          {/* The market is named here because it is the only thing that explains the list above it.
              Detection reads the page, and when it reads it wrong the failure surfaces as
              inexplicably foreign competitors -- unless the reader can see which market was used. */}
          <span className="text-muted-foreground">
            {' '}
            {fill(t.analysis.marketNote, { market: t.labels.market[analysis.market] })}
          </span>
        </p>
      )}

      {/* Above the tabs, like the snippet, because it is not one of the four lists: it is the
          measurement all four are about. Renders nothing for an analysis created before the
          measured columns existed. */}
      <MeasuredReadout input={readoutFor(analysis)} />

      {/* Tab order is the order of the work: fix the flow, then the words, then make sure the page
          can be found at all -- and only then prove a change live. An SEO task ranked in among the
          conversion tests would compete for the decision the reader is here to make. */}
      <AnalysisTabs
        counts={{
          flow: fixes.flow.length,
          copy: analysis.hypotheses.length,
          seo: visibility.seo.length,
          ai: visibility.ai.length,
          tests: testable.length
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
          ),
          tests: (
            <TestList
              analysisId={analysis.id}
              embedKey={analysis.embedKey}
              appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
              hypotheses={testable}
            />
          )
        }}
      />

      {user.plan === 'free' && <UpgradePrompt />}
    </div>
  )
}
