'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DisclosureCard } from '@/components/disclosure-card'
import { FlowCategoryBadge } from '@/components/flow-category-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'
import type { FlowFix } from '@/db/schema'
import type { FixKind } from '@/lib/enums'
import { cn } from '@/lib/utils'

// The two ranked lists of fixes, rendered by one component because they are one shape: the flow
// playbook (structural conversion fixes) and the visibility audit (what a crawler and a model can
// reach, read, and cite). `kind` selects the copy and nothing else -- there is no branch on it below
// the heading, which is the point.
//
// There is no "Set up test" action in either by design: these change the page itself rather than one
// line of text, so the embed snippet has nothing to swap and there is nothing to A/B.
//
// `expandFrom` is the index past which fixes collapse into scannable rows. Omitting it expands
// everything, which is what the print report needs -- nothing may be hidden on paper.
export function FlowPlaybook({
  fixes,
  kind = 'flow',
  expandFrom,
  className
}: {
  fixes: FlowFix[]
  kind?: FixKind
  expandFrom?: number
  className?: string
}) {
  const { dictionary } = useI18n()
  const copy = kind === 'visibility' ? dictionary.visibility : dictionary.playbook

  if (fixes.length === 0) return null

  const ordered = [...fixes].sort((a, b) => a.position - b.position)

  return (
    <section className={cn('space-y-3', className)} data-testid={`${kind}-playbook`}>
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight">{copy.title}</h2>
          <span className="print:hidden">
            <InfoHint label={copy.hintLabel}>
              <RichText>{copy.hint}</RichText>
            </InfoHint>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {ordered.map((fix, index) =>
          expandFrom !== undefined && index >= expandFrom ? (
            <CollapsedFlowFix key={fix.id} fix={fix} kind={kind} rank={index + 1} />
          ) : (
            <FlowFixCard key={fix.id} fix={fix} kind={kind} />
          )
        )}
      </div>
    </section>
  )
}

function FlowFixCard({ fix, kind }: { fix: FlowFix; kind: FixKind }) {
  return (
    <Card className="break-inside-avoid" data-testid={`${kind}-fix`}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <FlowCategoryBadge category={fix.category} />
        <div className="flex gap-2">
          <ScoreIndicator score={fix.impactScore} kind="impact" />
          <ScoreIndicator score={fix.effortScore} kind="effort" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
          {fix.title}
        </h3>
        <FlowFixBody fix={fix} kind={kind} />
      </CardContent>
    </Card>
  )
}

function CollapsedFlowFix({ fix, kind, rank }: { fix: FlowFix; kind: FixKind; rank: number }) {
  return (
    <DisclosureCard
      rank={rank}
      title={fix.title}
      testId={`${kind}-fix`}
      badge={<FlowCategoryBadge category={fix.category} />}
      scores={
        <>
          <ScoreIndicator score={fix.impactScore} kind="impact" variant="compact" />
          <ScoreIndicator score={fix.effortScore} kind="effort" variant="compact" />
        </>
      }
      openScores={
        <>
          <ScoreIndicator score={fix.impactScore} kind="impact" />
          <ScoreIndicator score={fix.effortScore} kind="effort" />
        </>
      }
    >
      <FlowFixBody fix={fix} kind={kind} />
    </DisclosureCard>
  )
}

function FlowFixBody({ fix, kind }: { fix: FlowFix; kind: FixKind }) {
  const { dictionary } = useI18n()
  const copy = kind === 'visibility' ? dictionary.visibility : dictionary.playbook

  return (
    <>
      <p className="text-sm text-muted-foreground">{fix.problem}</p>

      <div className="space-y-2 rounded-md bg-muted p-3">
        <p className="panel-label text-[0.6rem] text-muted-foreground">{copy.stepsLabel}</p>
        <ol className="space-y-2">
          {fix.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {fix.evidence && (
        <p className="text-xs text-muted-foreground">
          <span className="panel-label text-[0.6rem]">{copy.evidenceLabel}</span> {fix.evidence}
        </p>
      )}
    </>
  )
}
