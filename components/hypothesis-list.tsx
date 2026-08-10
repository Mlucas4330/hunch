'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HypothesisCard } from '@/components/hypothesis-card'
import { WhyBlock } from '@/components/why-block'
import {
  HypothesisFilters,
  type HypothesisSort,
  type TargetFilter
} from '@/components/hypothesis-filters'
import {
  HYPOTHESIS_EXPANDED_COUNT,
  HYPOTHESIS_FILTER_THRESHOLD,
  isQuickWin
} from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import type { Hypothesis, Variant } from '@/db/schema'
import { hasPlaceholders } from '@/lib/utils'

export type HypothesisWithVariants = Hypothesis & { variants: Variant[] }

const SORTERS: Record<
  HypothesisSort,
  (a: HypothesisWithVariants, b: HypothesisWithVariants) => number
> = {
  impact: (a, b) => b.impactScore - a.impactScore,
  effort: (a, b) => a.effortScore - b.effortScore || b.impactScore - a.impactScore,
  quickWins: (a, b) =>
    Number(isQuickWin(b)) - Number(isQuickWin(a)) || b.impactScore - a.impactScore
}

export function HypothesisList({ hypotheses }: { hypotheses: HypothesisWithVariants[] }) {
  const { dictionary } = useI18n()
  const [sort, setSort] = useState<HypothesisSort>('impact')
  const [target, setTarget] = useState<TargetFilter>('all')

  const visible = useMemo(() => {
    const kept = hypotheses.filter(
      (hypothesis) => target === 'all' || hypothesis.target === target
    )
    return kept.sort(SORTERS[sort])
  }, [hypotheses, sort, target])

  const isDefaultOrder = sort === 'impact' && target === 'all'
  const resetFilters = () => {
    setSort('impact')
    setTarget('all')
  }

  return (
    <div className="space-y-3">
      {hypotheses.length >= HYPOTHESIS_FILTER_THRESHOLD && (
        <HypothesisFilters sort={sort} onSort={setSort} target={target} onTarget={setTarget} />
      )}

      {visible.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">{dictionary.hypothesisList.noMatches}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={resetFilters}>
            {dictionary.hypothesisList.resetFilters}
          </Button>
        </Card>
      ) : (
        visible.map((hypothesis, index) => (
          <HypothesisRow
            key={hypothesis.id}
            hypothesis={hypothesis}
            rank={index + 1}
            isTop={index === 0 && isDefaultOrder}
            defaultOpen={index < HYPOTHESIS_EXPANDED_COUNT}
          />
        ))
      )}
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
        <div className="space-y-1 rounded-md bg-muted p-3">
          <p className="panel-label text-[0.6rem] text-muted-foreground">
            {dictionary.hypothesisList.recommendedChallenger}
          </p>
          <p className="text-sm">{recommended.copy}</p>
          {hasPlaceholders(recommended.copy) && (
            <p className="text-xs text-amber">{dictionary.hypothesisList.placeholderWarning}</p>
          )}
        </div>
      )}

      <WhyBlock label={dictionary.report.whyThisWorks}>
        <p>{hypothesis.rationale}</p>
        {recommended?.evidence && <p>{recommended.evidence}</p>}
      </WhyBlock>
    </>
  )
}
