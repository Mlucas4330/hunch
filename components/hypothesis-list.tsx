'use client'

import { useMemo } from 'react'
import { HypothesisCard } from '@/components/hypothesis-card'
import { CardDrawers } from '@/components/card-drawers'
import { ElementCrop } from '@/components/element-crop'
import { HYPOTHESIS_EXPANDED_COUNT } from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import type { Hypothesis } from '@/db/schema'

/**
 * The copy errors, on the one analysis surface there is. Each card quotes the line and says what is
 * wrong with it; nothing here writes a replacement.
 */
export function HypothesisList({
  hypotheses,
  screenshotUrl
}: {
  hypotheses: Hypothesis[]
  screenshotUrl: string | null
}) {
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
          <HypothesisBody hypothesis={hypothesis} screenshotUrl={screenshotUrl} />
        </HypothesisCard>
      ))}
    </div>
  )
}

function HypothesisBody({
  hypothesis,
  screenshotUrl
}: {
  hypothesis: Hypothesis
  screenshotUrl: string | null
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.hypothesisList

  return (
    <>
      <blockquote className="border-l-2 border-coral/40 pl-3 text-base font-medium leading-snug">
        <span className="sr-only">{dictionary.report.current}: </span>
        {hypothesis.currentCopy}
      </blockquote>

      <ElementCrop
        screenshotUrl={screenshotUrl}
        rect={hypothesis.elementRect}
        label={copy.cropLabel}
      />

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
