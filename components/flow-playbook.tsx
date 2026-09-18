'use client'

import type { CSSProperties } from 'react'
import { CardDrawers } from '@/components/card-drawers'
import { DisclosureCard } from '@/components/disclosure-card'
import { FlowCategoryBadge } from '@/components/flow-category-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { SeverityBadge } from '@/components/severity-badge'
import { useI18n } from '@/components/i18n-provider'
import { fixAnchor } from '@/lib/constants'
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
      <div className="space-y-3">
        {ordered.map((fix, index) => (
          <DisclosureCard
            key={fix.id}
            id={fixAnchor(fix.id)}
            title={fix.title}
            testId={`${section}-fix`}
            defaultOpen={expandFrom === undefined || index < expandFrom}
            badge={
              <>
                <SeverityBadge score={fix.impactScore} />
                <FlowCategoryBadge category={fix.category} />
              </>
            }
            score={<ScoreIndicator score={fix.impactScore} />}
            className="animate-stagger-in"
            style={{ '--index': index } as CSSProperties}
          >
            <p className="text-sm text-muted-foreground">{fix.problem}</p>

            {fix.businessImpact && (
              <p className="text-pretty text-sm font-medium">{fix.businessImpact}</p>
            )}

            <CardDrawers
              drawers={[{ id: 'why', label: copy.evidenceLabel, content: fix.evidence ?? null }]}
            />
          </DisclosureCard>
        ))}
      </div>
    </section>
  )
}
