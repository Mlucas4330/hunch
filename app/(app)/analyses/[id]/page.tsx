import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { HypothesisList } from '@/components/hypothesis-list'
import { InfoHint } from '@/components/info-hint'
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
              strongest <strong>challenger</strong> to try against your current copy, with a rationale
              and finished variant copy. Open the <strong>Report</strong> for a clean, printable
              summary you can share.
            </InfoHint>
          </div>
          <p className="truncate font-mono text-sm text-muted-foreground">{analysis.url}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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

      <HypothesisList hypotheses={analysis.hypotheses} />
    </div>
  )
}
