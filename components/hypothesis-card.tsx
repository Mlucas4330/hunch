'use client'

import type { ReactNode } from 'react'
import { DisclosureCard } from '@/components/disclosure-card'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { useI18n } from '@/components/i18n-provider'
import type { Hypothesis } from '@/db/schema'
import { cn } from '@/lib/utils'

export function HypothesisCard({
  hypothesis,
  isTop,
  defaultOpen,
  showManualBadge,
  className,
  children
}: {
  hypothesis: Hypothesis
  isTop?: boolean
  defaultOpen?: boolean
  showManualBadge?: boolean
  className?: string
  children: ReactNode
}) {
  const { dictionary } = useI18n()

  return (
    <DisclosureCard
      title={hypothesis.problem}
      testId="hypothesis-card"
      className={cn(isTop && 'ring-1 ring-coral/40', className)}
      defaultOpen={defaultOpen}
      score={<ScoreIndicator score={hypothesis.impactScore} />}
      badge={
        <>
          <SectionBadge section={hypothesis.section} />
          {showManualBadge && hypothesis.target === 'manual' && (
            <span className="rounded-full bg-neutral/15 px-2 py-0.5 text-xs font-medium text-neutral">
              {dictionary.hypothesisList.manualSetup}
            </span>
          )}
          {isTop && (
            <span className="panel-label text-nano text-coral">
              {dictionary.hypothesisList.testThisFirst}
            </span>
          )}
        </>
      }
    >
      {children}
    </DisclosureCard>
  )
}
