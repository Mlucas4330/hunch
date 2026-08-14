'use client'

import { useMemo } from 'react'
import { HypothesisCard } from '@/components/hypothesis-card'
import { WhyBlock } from '@/components/why-block'
import { HYPOTHESIS_EXPANDED_COUNT } from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import type { Hypothesis, Variant } from '@/db/schema'
import { hasPlaceholders } from '@/lib/utils'

export type HypothesisWithVariants = Hypothesis & { variants: Variant[] }

export function HypothesisList({ hypotheses }: { hypotheses: HypothesisWithVariants[] }) {
  const ranked = useMemo(
    () => [...hypotheses].sort((a, b) => b.impactScore - a.impactScore),
    [hypotheses]
  )

  return (
    <div className="space-y-3">
      {ranked.map((hypothesis, index) => (
        <HypothesisRow
          key={hypothesis.id}
          hypothesis={hypothesis}
          rank={index + 1}
          isTop={index === 0}
          defaultOpen={index < HYPOTHESIS_EXPANDED_COUNT}
        />
      ))}
    </div>
  )
}

function HypothesisRow({
  hypothesis,
  rank,
  isTop,
  defaultOpen
}: {
  hypothesis: HypothesisWithVariants
  rank: number
  isTop: boolean
  defaultOpen: boolean
}) {
  return (
    <HypothesisCard
      hypothesis={hypothesis}
      rank={rank}
      isTop={isTop}
      defaultOpen={defaultOpen}
      showManualBadge
    >
      <HypothesisBody hypothesis={hypothesis} />
    </HypothesisCard>
  )
}

function HypothesisBody({ hypothesis }: { hypothesis: HypothesisWithVariants }) {
  const { dictionary } = useI18n()
  const recommended = hypothesis.variants[0]

  return (
    <>
      {recommended && (
        <div className="space-y-3 rounded-md bg-muted p-3">
          <div className="space-y-1">
            <p className="panel-label text-[0.6rem] text-muted-foreground">
              {dictionary.report.current}
            </p>
            <p className="text-sm text-muted-foreground line-through">{hypothesis.currentCopy}</p>
          </div>
          <div className="space-y-1">
            <p className="panel-label text-[0.6rem] text-muted-foreground">
              {dictionary.hypothesisList.recommendedChallenger}
            </p>
            <p className="text-sm">{recommended.copy}</p>
          </div>
          {hasPlaceholders(recommended.copy) && (
            <p className="text-xs text-amber">{dictionary.hypothesisList.placeholderWarning}</p>
          )}
        </div>
      )}

      <WhyBlock label={dictionary.report.whyThisWorks}>
        <p>{hypothesis.rationale}</p>
        {recommended?.evidence && (
          <p>
            <span className="panel-label text-[0.6rem] text-teal">
              {dictionary.hypothesisList.competitorEvidence}
            </span>{' '}
            {recommended.evidence}
          </p>
        )}
      </WhyBlock>
    </>
  )
}
