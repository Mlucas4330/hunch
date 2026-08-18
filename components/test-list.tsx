'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmbedSnippet } from '@/components/embed-snippet'
import { ExampleTest } from '@/components/example-test'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { useI18n } from '@/components/i18n-provider'
import { EXPERIMENT_STATUS_BADGE_CLASS } from '@/lib/constants'
import type { ExperimentStatus } from '@/lib/enums'
import type { HypothesisWithVariants } from '@/components/hypothesis-list'
import { cn } from '@/lib/utils'

export function TestList({
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
  const { dictionary } = useI18n()
  const copy = dictionary.testList
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

  const ordered = [...hypotheses].sort((a, b) => {
    const running = Number(statusByHypothesis[b.id] === 'running') -
      Number(statusByHypothesis[a.id] === 'running')
    return running || b.impactScore - a.impactScore
  })

  return (
    <section className="space-y-4" data-testid="test-list">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight">{copy.title}</h2>
          <InfoHint label={copy.hintLabel}>
            <RichText>{copy.hint}</RichText>
          </InfoHint>
        </div>
      </div>

      <EmbedSnippet appUrl={appUrl} embedKey={embedKey} />

      {ordered.length === 0 ? (
        <div className="space-y-4">
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
          </Card>
          <ExampleTest />
        </div>
      ) : (
        <div className="space-y-2">
          {ordered.map((hypothesis) => (
            <TestRow
              key={hypothesis.id}
              analysisId={analysisId}
              hypothesis={hypothesis}
              status={statusByHypothesis[hypothesis.id]}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TestRow({
  analysisId,
  hypothesis,
  status
}: {
  analysisId: string
  hypothesis: HypothesisWithVariants
  status?: ExperimentStatus
}) {
  const { dictionary } = useI18n()

  return (
    <Card
      className="flex flex-wrap items-center justify-between gap-3 p-4"
      data-testid="test-row"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <SectionBadge section={hypothesis.section} />
          {status && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                EXPERIMENT_STATUS_BADGE_CLASS[status]
              )}
            >
              {dictionary.labels.experimentStatus[status]}
            </span>
          )}
        </div>
        <p className="font-display text-sm font-semibold leading-snug">{hypothesis.problem}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <ScoreIndicator score={hypothesis.impactScore} kind="impact" variant="compact" />
        <Button asChild size="sm" variant={status ? 'outline' : 'default'}>
          <Link href={`/analyses/${analysisId}/tests/${hypothesis.id}`}>
            {status ? dictionary.hypothesisList.viewTest : dictionary.hypothesisList.setUpTest}
          </Link>
        </Button>
      </div>
    </Card>
  )
}
