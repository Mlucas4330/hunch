'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DisclosureCard } from '@/components/disclosure-card'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import {
  HypothesisFilters,
  type HypothesisSort,
  type TargetFilter
} from '@/components/hypothesis-filters'
import {
  EXPERIMENT_STATUS_BADGE_CLASS,
  HYPOTHESIS_EXPANDED_COUNT,
  HYPOTHESIS_FILTER_THRESHOLD,
  isQuickWin
} from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import type { ExperimentStatus } from '@/lib/enums'
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

export function HypothesisList({
  analysisId,
  hypotheses
}: {
  analysisId: string
  hypotheses: HypothesisWithVariants[]
}) {
  const { dictionary } = useI18n()
  const [statusByHypothesis, setStatusByHypothesis] = useState<Record<string, ExperimentStatus>>({})
  const [sort, setSort] = useState<HypothesisSort>('impact')
  const [target, setTarget] = useState<TargetFilter>('all')
  const [hideCompleted, setHideCompleted] = useState(false)

  useEffect(() => {
    fetch(`/api/experiments?analysisId=${analysisId}`)
      .then((res) => (res.ok ? res.json() : { experiments: [] }))
      .then((data) => {
        const map: Record<string, ExperimentStatus> = {}
        for (const exp of data.experiments) map[exp.hypothesisId] = exp.status
        setStatusByHypothesis(map)
      })
      .catch(() => {})
  }, [analysisId])

  const visible = useMemo(() => {
    const kept = hypotheses.filter((hypothesis) => {
      if (target !== 'all' && hypothesis.target !== target) return false
      if (hideCompleted && statusByHypothesis[hypothesis.id] === 'completed') return false
      return true
    })
    return kept.sort(SORTERS[sort])
  }, [hypotheses, sort, target, hideCompleted, statusByHypothesis])

  // The recommendation only holds while the list is showing everything in impact order. Under any
  // other sort or filter the first row is simply the first match, not the thing to test first.
  const isDefaultOrder = sort === 'impact' && target === 'all' && !hideCompleted
  const resetFilters = () => {
    setSort('impact')
    setTarget('all')
    setHideCompleted(false)
  }

  return (
    <div className="space-y-3">
      {hypotheses.length >= HYPOTHESIS_FILTER_THRESHOLD && (
        <HypothesisFilters
          sort={sort}
          onSort={setSort}
          target={target}
          onTarget={setTarget}
          hideCompleted={hideCompleted}
          onHideCompleted={setHideCompleted}
        />
      )}

      {visible.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">{dictionary.hypothesisList.noMatches}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={resetFilters}>
            {dictionary.hypothesisList.resetFilters}
          </Button>
        </Card>
      ) : (
        visible.map((hypothesis, index) => {
          const status = statusByHypothesis[hypothesis.id]
          const shared = { analysisId, hypothesis, status }

          if (index < HYPOTHESIS_EXPANDED_COUNT) {
            return (
              <HypothesisCard
                key={hypothesis.id}
                {...shared}
                isTop={index === 0 && isDefaultOrder}
              />
            )
          }

          return (
            <CollapsedHypothesis key={hypothesis.id} {...shared} rank={index + 1} />
          )
        })
      )}
    </div>
  )
}

function HypothesisCard({
  analysisId,
  hypothesis,
  status,
  isTop
}: {
  analysisId: string
  hypothesis: HypothesisWithVariants
  status?: ExperimentStatus
  isTop: boolean
}) {
  const { dictionary } = useI18n()

  return (
    <Card className={cn(isTop && 'ring-1 ring-coral/40')} data-testid="hypothesis-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <SectionBadge section={hypothesis.section} />
          {hypothesis.target === 'manual' && (
            <span className="rounded-full bg-neutral/15 px-2 py-0.5 text-xs font-medium text-neutral">
              {dictionary.hypothesisList.manualSetup}
            </span>
          )}
          {isTop && !status && (
            <span className="panel-label text-[0.6rem] text-coral">
              {dictionary.hypothesisList.testThisFirst}
            </span>
          )}
          <StatusBadge status={status} />
        </div>
        <div className="flex gap-2">
          <ScoreIndicator score={hypothesis.impactScore} kind="impact" />
          <ScoreIndicator score={hypothesis.effortScore} kind="effort" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <h2 className="font-display text-lg font-semibold leading-snug tracking-tight">
          {hypothesis.problem}
        </h2>
        <HypothesisBody analysisId={analysisId} hypothesis={hypothesis} status={status} />
      </CardContent>
    </Card>
  )
}

// Everything past the expanded tier: a one-line row that opens into the same body the full card
// shows. A hypothesis with a live test always opens, whatever its rank -- a running experiment must
// never be something the reader has to go looking for.
function CollapsedHypothesis({
  analysisId,
  hypothesis,
  status,
  rank
}: {
  analysisId: string
  hypothesis: HypothesisWithVariants
  status?: ExperimentStatus
  rank: number
}) {
  return (
    <DisclosureCard
      rank={rank}
      title={hypothesis.problem}
      testId="hypothesis-row"
      defaultOpen={status === 'running'}
      badge={
        <span className="flex shrink-0 items-center gap-1.5">
          <SectionBadge section={hypothesis.section} />
          <StatusBadge status={status} />
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
      <HypothesisBody analysisId={analysisId} hypothesis={hypothesis} status={status} />
    </DisclosureCard>
  )
}

function HypothesisBody({
  analysisId,
  hypothesis,
  status
}: {
  analysisId: string
  hypothesis: HypothesisWithVariants
  status?: ExperimentStatus
}) {
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
      <div className="flex justify-end">
        <Button asChild size="sm" variant={status ? 'outline' : 'default'}>
          <Link href={`/analyses/${analysisId}/tests/${hypothesis.id}`}>
            {status ? dictionary.hypothesisList.viewTest : dictionary.hypothesisList.setUpTest}
          </Link>
        </Button>
      </div>
    </>
  )
}

function StatusBadge({ status }: { status?: ExperimentStatus }) {
  const { dictionary } = useI18n()
  if (!status) return null

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        EXPERIMENT_STATUS_BADGE_CLASS[status]
      )}
    >
      {dictionary.labels.experimentStatus[status]}
    </span>
  )
}
