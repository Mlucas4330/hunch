'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DisclosureCard } from '@/components/disclosure-card'
import { SectionBadge } from '@/components/section-badge'
import { WhyBlock } from '@/components/why-block'
import { ScoreIndicator } from '@/components/score-indicator'
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
import { cn, hasPlaceholders } from '@/lib/utils'

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

  // No experiment status is read here any more, and with it went the /api/experiments fetch and the
  // "hide finished" filter. Both were about test state, which is the Tests tab's subject now -- this
  // list answers what to change, not what is being proven.
  const visible = useMemo(() => {
    const kept = hypotheses.filter(
      (hypothesis) => target === 'all' || hypothesis.target === target
    )
    return kept.sort(SORTERS[sort])
  }, [hypotheses, sort, target])

  // The recommendation only holds while the list is showing everything in impact order. Under any
  // other sort or filter the first row is simply the first match, not the thing to test first.
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

// One shape for every rank. The top ones merely start open: a reader who has read the first idea can
// fold it away instead of scrolling past it forever.
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
  const { dictionary } = useI18n()

  return (
    <DisclosureCard
      rank={rank}
      title={hypothesis.problem}
      testId="hypothesis-card"
      className={cn(isTop && 'ring-1 ring-coral/40')}
      defaultOpen={defaultOpen}
      badge={
        <span className="flex shrink-0 items-center gap-1.5">
          <SectionBadge section={hypothesis.section} />
          {hypothesis.target === 'manual' && (
            <span className="rounded-full bg-neutral/15 px-2 py-0.5 text-xs font-medium text-neutral">
              {dictionary.hypothesisList.manualSetup}
            </span>
          )}
          {isTop && (
            <span className="panel-label text-[0.6rem] text-coral">
              {dictionary.hypothesisList.testThisFirst}
            </span>
          )}
        </span>
      }
      scores={
        <>
          <ScoreIndicator score={hypothesis.impactScore} kind="impact" variant="compact" />
          <ScoreIndicator score={hypothesis.effortScore} kind="effort" variant="compact" />
        </>
      }
      openScores={
        <>
          <ScoreIndicator score={hypothesis.impactScore} kind="impact" />
          <ScoreIndicator score={hypothesis.effortScore} kind="effort" />
        </>
      }
    >
      <HypothesisBody hypothesis={hypothesis} />
    </DisclosureCard>
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

      {/* The model is required to write a rationale for every hypothesis, and an evidence line for
          every variant. Neither reached this screen until now -- they were rendered only on the two
          report surfaces, so the reader was asked to pick a test with the argument for it missing. */}
      {/* No "Set up test" button here any more. Launching lives on the Tests tab, which is also
          where the snippet is installed -- a reader deciding what to change should not be asked to
          set up infrastructure in the middle of it. */}
      <WhyBlock label={dictionary.report.whyThisWorks}>
        <p>{hypothesis.rationale}</p>
        {recommended?.evidence && <p>{recommended.evidence}</p>}
      </WhyBlock>
    </>
  )
}
