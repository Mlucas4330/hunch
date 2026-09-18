'use client'

import { useMemo } from 'react'
import { HypothesisCard } from '@/components/hypothesis-card'
import { CardDrawers } from '@/components/card-drawers'
import {
  HYPOTHESIS_EXPANDED_COUNT,
  hypothesisQuoteAnchor,
  SECTION_ANCHOR_CLASS
} from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import type { Hypothesis } from '@/db/schema'
import { cn } from '@/lib/utils'

/**
 * The copy errors, on the one analysis surface there is. Each card quotes the line and says what is
 * wrong with it; nothing here writes a replacement.
 */
export function HypothesisList({ hypotheses }: { hypotheses: Hypothesis[] }) {
  const ranked = useMemo(
    () => [...hypotheses].sort((a, b) => b.impactScore - a.impactScore),
    [hypotheses]
  )

  return (
    <div className="space-y-3">
      {ranked.map((hypothesis, index) => (
        <HypothesisCard
          key={hypothesis.id}
          hypothesis={hypothesis}
          isTop={index === 0}
          defaultOpen={index < HYPOTHESIS_EXPANDED_COUNT}
        >
          <HypothesisBody hypothesis={hypothesis} />
        </HypothesisCard>
      ))}
    </div>
  )
}

function HypothesisBody({ hypothesis }: { hypothesis: Hypothesis }) {
  const { dictionary } = useI18n()
  const copy = dictionary.hypothesisList

  return (
    <>
      <blockquote
        id={hypothesisQuoteAnchor(hypothesis.id)}
        className={cn(
          'rounded-sm border-l-2 border-coral/40 pl-3 text-base font-medium leading-snug',
          SECTION_ANCHOR_CLASS
        )}
      >
        <span className="sr-only">{dictionary.report.current}: </span>
        {hypothesis.currentCopy}
      </blockquote>

      {hypothesis.businessImpact && (
        <p className="text-pretty text-sm font-medium">{hypothesis.businessImpact}</p>
      )}

      <CardDrawers
        drawers={[
          {
            id: 'why',
            label: dictionary.report.whyThisIsWrong,
            content: (
              <>
                {hypothesis.assessment && (
                  <p>
                    <span className="panel-label text-nano text-purple-soft">
                      {copy.assessmentLabel}
                    </span>{' '}
                    {hypothesis.assessment}
                  </p>
                )}
                <p>{hypothesis.rationale}</p>
              </>
            )
          }
        ]}
      />
    </>
  )
}
