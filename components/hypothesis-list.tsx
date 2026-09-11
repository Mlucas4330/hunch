'use client'

import { useMemo } from 'react'
import { HypothesisCard } from '@/components/hypothesis-card'
import { CardDrawers } from '@/components/card-drawers'
import { RankedListHeader } from '@/components/ranked-list-header'
import { HYPOTHESIS_EXPANDED_COUNT } from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import type { Hypothesis } from '@/db/schema'

/**
 * The copy errors, on the one analysis surface there is. Each card quotes the line and says what is
 * wrong with it; nothing here writes a replacement.
 */
export function HypothesisList({ hypotheses }: { hypotheses: Hypothesis[] }) {
  const { dictionary } = useI18n()
  const copy = dictionary.hypothesisList

  const ranked = useMemo(
    () => [...hypotheses].sort((a, b) => b.impactScore - a.impactScore),
    [hypotheses]
  )

  return (
    <div className="space-y-3">
      <RankedListHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        hintLabel={copy.hintLabel}
        hint={copy.hint}
      />
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
      <blockquote className="border-l-2 border-coral/40 pl-3 text-base font-medium leading-snug">
        <span className="sr-only">{dictionary.report.current}: </span>
        {hypothesis.currentCopy}
      </blockquote>

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
