'use client'

import { CardDrawers } from '@/components/card-drawers'
import { DisclosureCard } from '@/components/disclosure-card'
import { FlowCategoryBadge } from '@/components/flow-category-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { RankedListHeader } from '@/components/ranked-list-header'
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
      <RankedListHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        hintLabel={copy.hintLabel}
        hint={copy.hint}
      />

      <div className="space-y-3">
        {ordered.map((fix, index) => (
          <DisclosureCard
            key={fix.id}
            title={fix.title}
            testId={`${section}-fix`}
            defaultOpen={expandFrom === undefined || index < expandFrom}
            badge={<FlowCategoryBadge category={fix.category} />}
            score={<ScoreIndicator score={fix.impactScore} />}
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

      {/* Why comes first in the row and the steps open by default. The order is the constraint --
          the argument is read before the instructions, never as a footnote under them -- and which
          one starts open is a separate question: the steps are what the card exists to hand over,
          so they are what an open card shows. See docs/analysis-ui.md. */}
      <CardDrawers
        defaultDrawer="steps"
        drawers={[
          {
            id: 'why',
            label: copy.evidenceLabel,
            content: fix.evidence ?? null
          },
          {
            id: 'steps',
            label: copy.stepsLabel,
            testId: `${section}-steps`,
            content: (
              <ol className="space-y-2">
                {fix.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )
          }
        ]}
      />
    </>
  )
}
