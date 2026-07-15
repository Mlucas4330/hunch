import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { experiments, experimentStats, hypotheses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { experimentWithResult } from '@/lib/experiments'
import { TestRunner, type TestExperiment } from '@/components/test-runner'
import { InfoHint } from '@/components/info-hint'
import { SECTION_LABEL } from '@/lib/constants'
import { Button } from '@/components/ui/button'

export default async function RunTestPage({
  params
}: {
  params: Promise<{ id: string; hypothesisId: string }>
}) {
  const { id, hypothesisId } = await params
  const user = await getCurrentUser()
  if (!user) notFound()

  const hypothesis = await db.query.hypotheses.findFirst({
    where: eq(hypotheses.id, hypothesisId),
    with: {
      analysis: true,
      variants: { orderBy: (v, { asc }) => asc(v.position) }
    }
  })

  if (!hypothesis || hypothesis.analysis.userId !== user.id || hypothesis.analysisId !== id) {
    notFound()
  }

  const experimentRow = await db.query.experiments.findFirst({
    where: eq(experiments.hypothesisId, hypothesisId),
    orderBy: (e, { desc }) => desc(e.createdAt)
  })

  let initialExperiment: TestExperiment | null = null
  if (experimentRow) {
    const stats = await db
      .select()
      .from(experimentStats)
      .where(eq(experimentStats.experimentId, experimentRow.id))
    const withResult = experimentWithResult(experimentRow, stats)
    initialExperiment = {
      id: withResult.id,
      status: withResult.status,
      section: hypothesis.section,
      problem: hypothesis.problem,
      controlCopy: withResult.controlCopy,
      variantCopy: withResult.variantCopy,
      durationDays: withResult.durationDays,
      endsAt: withResult.endsAt ? withResult.endsAt.toISOString() : null,
      result: withResult.result
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="panel-label text-[0.7rem] text-muted-foreground">
              Run a test - {SECTION_LABEL[hypothesis.section]}
            </p>
            <InfoHint label="How running a test works">
              Your current copy is the <strong>control</strong>. Pick a <strong>challenger</strong>,
              edit it to fit your product (replace any [bracketed] placeholders with real details),
              and choose how long to run. On <strong>Launch</strong>, the snippet shows the challenger
              to half your visitors and tracks conversions. When the window ends we read the result
              once and recommend a winner.
            </InfoHint>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{hypothesis.problem}</h1>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href={`/analyses/${id}`}>Back to ideas</Link>
        </Button>
      </div>

      <TestRunner
        url={hypothesis.analysis.url}
        hypothesis={{
          id: hypothesis.id,
          section: hypothesis.section,
          problem: hypothesis.problem,
          currentCopy: hypothesis.currentCopy,
          variants: hypothesis.variants.map((v) => ({ id: v.id, copy: v.copy }))
        }}
        initialExperiment={initialExperiment}
      />
    </div>
  )
}
