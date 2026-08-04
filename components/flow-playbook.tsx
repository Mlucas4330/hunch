'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DisclosureCard } from '@/components/disclosure-card'
import { FlowCategoryBadge } from '@/components/flow-category-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'
import type { FlowFix } from '@/db/schema'
import { cn } from '@/lib/utils'

// The flow playbook: structural fixes, shown on the analysis screen and on both reports. There is no
// "Set up test" action here by design -- these change the page's structure rather than one line of
// text, so the embed snippet has nothing to swap and there is nothing to A/B.
//
// `expandFrom` is the index past which fixes collapse into scannable rows. Omitting it expands
// everything, which is what the print report needs -- nothing may be hidden on paper.
export function FlowPlaybook({
  fixes,
  expandFrom,
  className
}: {
  fixes: FlowFix[]
  expandFrom?: number
  className?: string
}) {
  const { dictionary } = useI18n()

  if (fixes.length === 0) return null

  const ordered = [...fixes].sort((a, b) => a.position - b.position)

  return (
    <section className={cn('space-y-3', className)} data-testid="flow-playbook">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">
          {dictionary.playbook.eyebrow}
        </p>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight">
            {dictionary.playbook.title}
          </h2>
          <span className="print:hidden">
            <InfoHint label={dictionary.playbook.hintLabel}>
              <RichText>{dictionary.playbook.hint}</RichText>
            </InfoHint>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {ordered.map((fix, index) =>
          expandFrom !== undefined && index >= expandFrom ? (
            <CollapsedFlowFix key={fix.id} fix={fix} rank={index + 1} />
          ) : (
            <FlowFixCard key={fix.id} fix={fix} />
          )
        )}
      </div>
    </section>
  )
}

function FlowFixCard({ fix }: { fix: FlowFix }) {
  return (
    <Card className="break-inside-avoid" data-testid="flow-fix">
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
        <FlowFixBody fix={fix} />
      </CardContent>
    </Card>
  )
}

function CollapsedFlowFix({ fix, rank }: { fix: FlowFix; rank: number }) {
  return (
    <DisclosureCard
      rank={rank}
      title={fix.title}
      testId="flow-fix"
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
      <FlowFixBody fix={fix} />
    </DisclosureCard>
  )
}

function FlowFixBody({ fix }: { fix: FlowFix }) {
  const { dictionary } = useI18n()

  return (
    <>
      <p className="text-sm text-muted-foreground">{fix.problem}</p>

      <div className="space-y-2 rounded-md bg-muted p-3">
        <p className="panel-label text-[0.6rem] text-muted-foreground">
          {dictionary.playbook.stepsLabel}
        </p>
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
          <span className="panel-label text-[0.6rem]">{dictionary.playbook.evidenceLabel}</span>{' '}
          {fix.evidence}
        </p>
      )}
    </>
  )
}
