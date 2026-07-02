import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { AnalysisCircuit } from '@/components/analysis-circuit'

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
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">Circuit</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Pick your winners</h1>
        <p className="truncate font-mono text-sm text-muted-foreground">{analysis.url}</p>
      </div>

      <AnalysisCircuit
        url={analysis.url}
        hypotheses={analysis.hypotheses}
        competitors={analysis.competitors}
      />
    </div>
  )
}
