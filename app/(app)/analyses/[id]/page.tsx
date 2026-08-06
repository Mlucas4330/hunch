import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { HypothesisList } from '@/components/hypothesis-list'
import { FlowPlaybook } from '@/components/flow-playbook'
import { EmbedSnippet } from '@/components/embed-snippet'
import { InfoHint } from '@/components/info-hint'
import { CopyReportLink } from '@/components/copy-report-link'
import { UpgradePrompt } from '@/components/upgrade-prompt'
import { RichText } from '@/components/rich-text'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { splitFixes } from '@/lib/analyses'
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
          />
          <Button asChild variant="outline" size="sm">
            <Link href={`/analyses/${analysis.id}/report`}>{t.analysis.report}</Link>
          </Button>
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

      {/* Section order lives here rather than inside HypothesisList: site-level setup first, then
          the structural fixes, then the copy tests that run behind the snippet, and last the
          discoverability audit -- what the reader came for is the ranked tests, and an SEO task
          interleaved among them competes for the decision they are here to make. */}
      <EmbedSnippet
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
        embedKey={analysis.embedKey}
      />

      <FlowPlaybook fixes={fixes.flow} expandFrom={PLAYBOOK_EXPANDED_COUNT} />

      <HypothesisList analysisId={analysis.id} hypotheses={analysis.hypotheses} />

      <FlowPlaybook fixes={fixes.visibility} kind="visibility" expandFrom={PLAYBOOK_EXPANDED_COUNT} />

      {user.plan === 'free' && <UpgradePrompt />}
    </div>
  )
}
