'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
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
        <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} isTop={index === 0} />
      ))}
    </div>
  )
}

function HypothesisCard({
  hypothesis,
  isTop
}: {
  hypothesis: HypothesisWithVariants
  isTop: boolean
}) {
  const recommended = hypothesis.variants[0]

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <SectionBadge section={hypothesis.section} />
          {isTop && <span className="panel-label text-[0.6rem] text-coral">Test this first</span>}
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
            {hasPlaceholders(recommended.copy) && (
              <p className="text-xs text-amber">
                Has [placeholders] - swap in your real details before shipping.
              </p>
            )}
          </div>
        )}
        <p className="text-sm text-muted-foreground">{hypothesis.rationale}</p>
      </CardContent>
    </Card>
  )
}
