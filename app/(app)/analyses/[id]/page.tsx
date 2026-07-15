import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { HypothesisList } from '@/components/hypothesis-list'
import { InfoHint } from '@/components/info-hint'
import { CopyReportLink } from '@/components/copy-report-link'
import { Button } from '@/components/ui/button'

export default async function AnalysisDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) notFound()

  const analysis = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, user.id)),
    with: { hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.position) } } } }
  })

  if (!analysis) notFound()

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">What to test</p>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">Your test ideas</h1>
            <InfoHint label="How to use this screen">
              Each card is a test idea, ranked by likely impact. For each one the AI recommends the
              strongest <strong>challenger</strong> to try against your current copy. Pick one and
              press <strong>Set up test</strong> - you run one test at a time, and the live results
              (not your guess) decide the winner. Install the snippet once and every test runs behind
              it.
            </InfoHint>
          </div>
          <p className="truncate font-mono text-sm text-muted-foreground">{analysis.url}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CopyReportLink
            reportUrl={process.env.NEXT_PUBLIC_REPORT_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''}
            embedKey={analysis.embedKey}
          />
          <Button asChild variant="outline" size="sm">
            <Link href={`/analyses/${analysis.id}/report`}>Report</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>

      {analysis.competitors && analysis.competitors.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="benchmarked-against">
          Benchmarked against:{' '}
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
        </p>
      )}

      <HypothesisList
        analysisId={analysis.id}
        embedKey={analysis.embedKey}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
        hypotheses={analysis.hypotheses}
      />
    </div>
  )
}
