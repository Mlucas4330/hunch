'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { EmbedSnippet } from '@/components/embed-snippet'
import { EXPERIMENT_STATUS_BADGE_CLASS, EXPERIMENT_STATUS_LABEL } from '@/lib/constants'
import type { ExperimentStatus } from '@/lib/enums'
import type { Hypothesis, Variant } from '@/db/schema'
import { cn } from '@/lib/utils'

export type HypothesisWithVariants = Hypothesis & { variants: Variant[] }

export function HypothesisList({
  analysisId,
  embedKey,
  appUrl,
  hypotheses
}: {
  analysisId: string
  embedKey: string
  appUrl: string
  hypotheses: HypothesisWithVariants[]
}) {
  const [statusByHypothesis, setStatusByHypothesis] = useState<Record<string, ExperimentStatus>>({})

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

  const ranked = useMemo(
    () => [...hypotheses].sort((a, b) => b.impactScore - a.impactScore),
    [hypotheses]
  )

  return (
    <div className="space-y-6">
      <EmbedSnippet appUrl={appUrl} embedKey={embedKey} />

      <div className="space-y-3">
        {ranked.map((hypothesis, index) => (
          <HypothesisCard
            key={hypothesis.id}
            analysisId={analysisId}
            hypothesis={hypothesis}
            status={statusByHypothesis[hypothesis.id]}
            isTop={index === 0}
          />
        ))}
      </div>
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
  const recommended = hypothesis.variants[0]
  const href = `/analyses/${analysisId}/tests/${hypothesis.id}`

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <SectionBadge section={hypothesis.section} />
          {isTop && !status && (
            <span className="panel-label text-[0.6rem] text-coral">Test this first</span>
          )}
          {status && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                EXPERIMENT_STATUS_BADGE_CLASS[status]
              )}
            >
              {EXPERIMENT_STATUS_LABEL[status]}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <ScoreIndicator label="Impact" score={hypothesis.impactScore} kind="impact" />
          <ScoreIndicator label="Effort" score={hypothesis.effortScore} kind="effort" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <h2 className="font-display text-lg font-semibold leading-snug tracking-tight">
          {hypothesis.problem}
        </h2>
        {recommended && (
          <div className="space-y-1 rounded-md bg-muted p-3">
            <p className="panel-label text-[0.6rem] text-muted-foreground">Recommended challenger</p>
            <p className="text-sm">{recommended.copy}</p>
          </div>
        )}
        <div className="flex justify-end">
          <Button asChild size="sm" variant={status ? 'outline' : 'default'}>
            <Link href={href}>{status ? 'View test' : 'Set up test'}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
