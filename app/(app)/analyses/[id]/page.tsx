import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { HypothesisList } from '@/components/hypothesis-list'
import { FlowPlaybook } from '@/components/flow-playbook'
import { AnalysisTabs } from '@/components/analysis-tabs'
import { InfoHint } from '@/components/info-hint'
import { ReportDeliverables } from '@/components/report-deliverables'
import { RichText } from '@/components/rich-text'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/i18n'
import { MeasuredReadout } from '@/components/measured-readout'
import { MeasurePage } from '@/components/measure-page'
import { UnlockWall } from '@/components/unlock-wall'
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
  const measured = hasReadout(readout(readoutFor(analysis)))

  // **An owned analysis can have nothing generated in it**, and now commonly does: a reader whose
  // balance was empty gets an ownerless measured run, and claiming it on sign in hands them the row
  // without ever having paid for the half a model writes. Rendering the tabs anyway gave them four
  // empty panels and no way to read what had happened, so the same wall the public report uses stands
  // here instead. See docs/invariants.md.
  const generated = analysis.hypotheses.length > 0 || analysis.flowFixes.length > 0
  const history = measured ? await readoutHistory(analysis.id) : { previous: null, scores: [] }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
        {/* w-full because the parent is `items-start` in column direction, which sizes a child to its
            own content -- so `truncate` on the URL below had nothing to truncate against and a long
            one pushed the whole page sideways on a phone. `sm:flex-1` does the same job once the
            parent turns into a row. */}
        <div className="w-full min-w-0 space-y-1 sm:flex-1">
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

      <ReportDeliverables
        reportUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
        embedKey={analysis.embedKey}
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

      {generated ? (
        <AnalysisTabs
          counts={{
            flow: fixes.flow.length,
            copy: analysis.hypotheses.length,
            seo: visibility.seo.length,
            ai: visibility.ai.length
          }}
          // Each panel carries a `key` even though none of them is in an array here. They are created
          // in a server component and rendered by a client one, and crossing that boundary costs them
          // the marking that tells React these are statically placed children -- so on the client side
          // they look like an unkeyed list and dev warns about every one. See docs/analysis-ui.md.
          panels={{
            flow: <FlowPlaybook key="flow" fixes={fixes.flow} expandFrom={PLAYBOOK_EXPANDED_COUNT} />,
            copy: <HypothesisList key="copy" hypotheses={analysis.hypotheses} />,
            seo: (
              <FlowPlaybook
                key="seo"
                fixes={visibility.seo}
                section="seo"
                expandFrom={PLAYBOOK_EXPANDED_COUNT}
              />
            ),
            ai: (
              <FlowPlaybook
                key="ai"
                fixes={visibility.ai}
                section="ai"
                expandFrom={PLAYBOOK_EXPANDED_COUNT}
              />
            )
          }}
        />
      ) : (
        <UnlockWall embedKey={analysis.embedKey} />
      )}

    </div>
  )
}
