'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ExperimentPanel, type PanelExperiment } from '@/components/experiment-panel'
import {
  DEFAULT_EXPERIMENT_DURATION,
  GOAL_CANDIDATE_LIMIT,
  VARIANTS_PER_HYPOTHESIS
} from '@/lib/constants'
import { EXPERIMENT_DURATIONS } from '@/lib/enums'
import type { ExperimentDuration, Section } from '@/lib/enums'
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

export type GoalOption = { text: string; selector: string }

export function TestRunner({
  url,
  hypothesis,
  goals,
  canExport,
  initialExperiment
}: {
  url: string
  hypothesis: HypothesisInput
  goals: GoalOption[]
  canExport: boolean
  initialExperiment: TestExperiment | null
}) {
  const [experiment, setExperiment] = useState<TestExperiment | null>(initialExperiment)

  if (experiment) {
    return <ExperimentPanel experiment={experiment} url={url} canExport={canExport} />
  }

  return <LaunchForm hypothesis={hypothesis} goals={goals} onLaunched={setExperiment} />
}

function LaunchForm({
  hypothesis,
  goals,
  onLaunched
}: {
  hypothesis: HypothesisInput
  goals: GoalOption[]
  onLaunched: (experiment: TestExperiment) => void
}) {
  const { dictionary } = useI18n()
  const [variants, setVariants] = useState(hypothesis.variants)
  const [variantId, setVariantId] = useState(hypothesis.variants[0]?.id ?? '')
  const [copy, setCopy] = useState(hypothesis.variants[0]?.copy ?? '')
  const [duration, setDuration] = useState<ExperimentDuration>(DEFAULT_EXPERIMENT_DURATION)
  const [goalSelector, setGoalSelector] = useState(goals[0]?.selector ?? '')
  const [pending, setPending] = useState(false)
  const [gated, setGated] = useState(false)
  const [manualTarget, setManualTarget] = useState(false)
  const [error, setError] = useState(false)

  // The analysis only writes the recommended challenger; the alternates are generated the first
  // time someone actually opens this screen. Fail quiet -- the recommendation is already usable,
  // and launching must not wait on this.
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
    setManualTarget(false)
    setError(false)
    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesisId: hypothesis.id,
          variantId,
          variantCopy: copy.trim() || undefined,
          goalSelector: goalSelector.trim() || undefined,
          durationDays: duration
        })
      })
      if (res.status === 403) {
        setGated(true)
        return
      }
      if (res.status === 422) {
        const body = await res.json().catch(() => null)
        if (body?.error === 'manual_target') {
          setManualTarget(true)
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
        goalSelector: data.experiment.goalSelector,
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
          {goals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {goals.slice(0, GOAL_CANDIDATE_LIMIT).map((goal) => (
                <button
                  key={goal.selector}
                  type="button"
                  onClick={() => setGoalSelector(goal.selector)}
                  disabled={pending}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    goalSelector === goal.selector
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  {goal.text}
                </button>
              ))}
            </div>
          )}
          <Input
            value={goalSelector}
            onChange={(e) => setGoalSelector(e.target.value)}
            disabled={pending}
            placeholder={dictionary.testRunner.goalPlaceholder}
            data-testid="goal-selector"
          />
          <p className="text-xs text-muted-foreground">{dictionary.testRunner.goalHelp}</p>
          {!goalSelector.trim() && (
            <p className="text-xs text-amber" data-testid="goal-warning">
              {dictionary.testRunner.goalWarning}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="panel-label text-[0.7rem] text-muted-foreground">
            {dictionary.testRunner.testLength}
          </span>
          {EXPERIMENT_DURATIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDuration(days)}
              disabled={pending}
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
          <Link href="/billing" className="font-medium underline underline-offset-2">
            {dictionary.common.upgrade}
          </Link>{' '}
          {dictionary.testRunner.gatedAfter}
        </p>
      )}
      {manualTarget && <p className="text-sm text-amber">{dictionary.testRunner.manualTarget}</p>}
      {error && <p className="text-sm text-destructive">{dictionary.testRunner.error}</p>}
    </div>
  )
}
