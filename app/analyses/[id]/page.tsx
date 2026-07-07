import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { HypothesisList } from '@/components/hypothesis-list'
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
    with: { hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.id) } } } }
  })

  if (!analysis) notFound()

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">What to test</p>
          <h1 className="font-display text-2xl font-bold tracking-tight">Your test ideas</h1>
          <p className="truncate font-mono text-sm text-muted-foreground">{analysis.url}</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
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
