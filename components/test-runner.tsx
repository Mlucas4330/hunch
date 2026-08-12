'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExperimentPanel, type PanelExperiment } from '@/components/experiment-panel'
import {
  CONTACT_PATH,
  DEFAULT_EXPERIMENT_DURATION,
  GOAL_ATTRIBUTE,
  VARIANTS_PER_HYPOTHESIS
} from '@/lib/constants'
import { EXPERIMENT_DURATIONS } from '@/lib/enums'
import type { ExperimentDuration, ExperimentStatus, Section } from '@/lib/enums'
import { useI18n } from '@/components/i18n-provider'
import { t } from '@/lib/i18n/format'
import { cn, hasPlaceholders } from '@/lib/utils'

const textareaClass =
  'flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50'

export type TestExperiment = PanelExperiment

type HypothesisInput = {
  id: string
  section: Section
  problem: string
  currentCopy: string
  variants: { id: string; copy: string }[]
}

export function TestRunner({
  url,
  hypothesis,
  canExport,
  initialExperiment
}: {
  url: string
  hypothesis: HypothesisInput
  canExport: boolean
  initialExperiment: TestExperiment | null
}) {
  const { dictionary } = useI18n()
  const [experiment, setExperiment] = useState<TestExperiment | null>(initialExperiment)

  const handleStatusChange = useCallback(
    (status: ExperimentStatus) => setExperiment((e) => (e ? { ...e, status } : e)),
    []
  )

  if (experiment) {
    return (
      <div className="space-y-4">
        <ExperimentPanel
          experiment={experiment}
          url={url}
          canExport={canExport}
          onStatusChange={handleStatusChange}
        />
        {experiment.status !== 'running' && (
          <Button
            variant="outline"
            onClick={() => setExperiment(null)}
            data-testid="relaunch-experiment"
          >
            {dictionary.runTest.relaunch}
          </Button>
        )}
      </div>
    )
  }

  return <LaunchForm hypothesis={hypothesis} onLaunched={setExperiment} />
}

function LaunchForm({
  hypothesis,
  onLaunched
}: {
  hypothesis: HypothesisInput
  onLaunched: (experiment: TestExperiment) => void
}) {
  const { dictionary } = useI18n()
  const [variants, setVariants] = useState(hypothesis.variants)
  const [variantId, setVariantId] = useState(hypothesis.variants[0]?.id ?? '')
  const [copy, setCopy] = useState(hypothesis.variants[0]?.copy ?? '')
  const [duration, setDuration] = useState<ExperimentDuration>(DEFAULT_EXPERIMENT_DURATION)
  const [pending, setPending] = useState(false)
  const [gated, setGated] = useState(false)
  const [goalMissing, setGoalMissing] = useState(false)
  const [manualTarget, setManualTarget] = useState(false)
  const [alreadyRunning, setAlreadyRunning] = useState(false)
  const [error, setError] = useState(false)

  const needsAlternates = variants.length < VARIANTS_PER_HYPOTHESIS
  const [loadingAlternates, setLoadingAlternates] = useState(needsAlternates)

  useEffect(() => {
    if (!needsAlternates) return
    let active = true

    fetch(`/api/hypotheses/${hypothesis.id}/variants`, { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { variants: { id: string; copy: string }[] } | null) => {
        if (!active) return
        if (data?.variants?.length) setVariants(data.variants)
        setLoadingAlternates(false)
      })
      .catch(() => active && setLoadingAlternates(false))

    return () => {
      active = false
    }
  }, [hypothesis.id, needsAlternates])

  function selectVariant(id: string) {
    setVariantId(id)
    setCopy(variants.find((v) => v.id === id)?.copy ?? '')
  }

  async function launch() {
    setPending(true)
    setGated(false)
    setGoalMissing(false)
    setManualTarget(false)
    setAlreadyRunning(false)
    setError(false)
    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesisId: hypothesis.id,
          variantId,
          variantCopy: copy.trim() || undefined,
          durationDays: duration
        })
      })
      if (res.status === 403) {
        setGated(true)
        return
      }
      if (res.status === 409) {
        setAlreadyRunning(true)
        return
      }
      if (res.status === 422) {
        const body = await res.json().catch(() => null)
        if (body?.error === 'manual_target') {
          setManualTarget(true)
          return
        }
        if (body?.error === 'goal_missing') {
          setGoalMissing(true)
          return
        }
        setError(true)
        return
      }
      if (!res.ok) {
        setError(true)
        return
      }
      const data = await res.json()
      onLaunched({
        id: data.experiment.id,
        status: data.experiment.status,
        section: hypothesis.section,
        problem: hypothesis.problem,
        controlCopy: data.experiment.controlCopy,
        variantCopy: data.experiment.variantCopy,
        durationDays: data.experiment.durationDays,
        endsAt: data.experiment.endsAt,
        result: data.experiment.result
      })
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{dictionary.testRunner.controlTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {hypothesis.currentCopy}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {dictionary.testRunner.challengerTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {variants.map((variant, i) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => selectVariant(variant.id)}
                disabled={pending}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  variantId === variant.id
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {t(dictionary.testRunner.variant, { letter: String.fromCharCode(65 + i) })}
                {i === 0 ? dictionary.testRunner.recommendedSuffix : ''}
              </button>
            ))}
            {loadingAlternates && (
              <span
                className="text-xs text-muted-foreground"
                role="status"
                data-testid="alternates-loading"
              >
                {dictionary.testRunner.writingAlternates}
              </span>
            )}
          </div>
          <textarea
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            disabled={pending}
            className={textareaClass}
            data-testid="challenger-copy"
          />
          {hasPlaceholders(copy) && (
            <p className="text-xs text-amber" data-testid="placeholder-warning">
              {dictionary.testRunner.placeholderWarning}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{dictionary.testRunner.goalTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{dictionary.testRunner.goalHelp}</p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
            {`<button ${GOAL_ATTRIBUTE}>...</button>`}
          </pre>
          {goalMissing && (
            <p className="text-xs text-amber" data-testid="goal-warning">
              {dictionary.testRunner.goalMissing}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="panel-label text-[0.7rem] text-muted-foreground">
            {dictionary.testRunner.testLength}
          </span>
          {EXPERIMENT_DURATIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDuration(days)}
              disabled={pending}
              data-testid={`duration-${days}`}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                duration === days
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {t(dictionary.testRunner.days, { days })}
            </button>
          ))}
        </div>
        <Button disabled={pending || !variantId} onClick={launch} data-testid="launch-experiment">
          {pending ? dictionary.testRunner.launching : dictionary.testRunner.launch}
        </Button>
      </div>

      {gated && (
        <p className="text-sm text-red">
          {dictionary.testRunner.gatedBefore}{' '}
          <Link href={CONTACT_PATH} className="font-medium underline underline-offset-2">
            {dictionary.common.upgrade}
          </Link>{' '}
          {dictionary.testRunner.gatedAfter}
        </p>
      )}
      {manualTarget && <p className="text-sm text-amber">{dictionary.testRunner.manualTarget}</p>}
      {alreadyRunning && (
        <p className="text-sm text-amber" data-testid="already-running">
          {dictionary.testRunner.alreadyRunning}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{dictionary.testRunner.error}</p>}
    </div>
  )
}
