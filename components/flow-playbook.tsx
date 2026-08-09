'use client'

import { DisclosureCard } from '@/components/disclosure-card'
import { FlowCategoryBadge } from '@/components/flow-category-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { WhyBlock } from '@/components/why-block'
import { useI18n } from '@/components/i18n-provider'
import type { FlowFix } from '@/db/schema'
import type { PlaybookSection } from '@/lib/enums'
import { cn } from '@/lib/utils'

export function FlowPlaybook({
  fixes,
  section = 'flow',
  expandFrom,
  className
}: {
  fixes: FlowFix[]
  section?: PlaybookSection
  expandFrom?: number
  className?: string
}) {
  const { dictionary } = useI18n()
  const copy = dictionary[section]

  if (fixes.length === 0) return null

  const ordered = [...fixes].sort((a, b) => a.position - b.position)

  return (
    <section className={cn('space-y-3', className)} data-testid={`${section}-playbook`}>
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
        {ordered.map((fix, index) => (
          <DisclosureCard
            key={fix.id}
            rank={index + 1}
            title={fix.title}
            testId={`${section}-fix`}
            defaultOpen={expandFrom === undefined || index < expandFrom}
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
            <FlowFixBody fix={fix} section={section} />
          </DisclosureCard>
        ))}
      </div>
    </section>
  )
}

function FlowFixBody({ fix, section }: { fix: FlowFix; section: PlaybookSection }) {
  const { dictionary } = useI18n()
  const copy = dictionary[section]

  return (
    <>
      <p className="text-sm text-muted-foreground">{fix.problem}</p>

      {fix.evidence && <WhyBlock label={copy.evidenceLabel}>{fix.evidence}</WhyBlock>}

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
    </>
  )
}
