'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExperimentPanel, type PanelExperiment } from '@/components/experiment-panel'
import { DEFAULT_EXPERIMENT_DURATION } from '@/lib/constants'
import { EXPERIMENT_DURATIONS } from '@/lib/enums'
import type { ExperimentDuration, Section } from '@/lib/enums'
import { cn } from '@/lib/utils'

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
  initialExperiment
}: {
  url: string
  hypothesis: HypothesisInput
  initialExperiment: TestExperiment | null
}) {
  const [experiment, setExperiment] = useState<TestExperiment | null>(initialExperiment)

  if (experiment) {
    return <ExperimentPanel experiment={experiment} url={url} />
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
  const [variantId, setVariantId] = useState(hypothesis.variants[0]?.id ?? '')
  const [copy, setCopy] = useState(hypothesis.variants[0]?.copy ?? '')
  const [duration, setDuration] = useState<ExperimentDuration>(DEFAULT_EXPERIMENT_DURATION)
  const [pending, setPending] = useState(false)
  const [gated, setGated] = useState(false)
  const [error, setError] = useState(false)

  function selectVariant(id: string) {
    setVariantId(id)
    setCopy(hypothesis.variants.find((v) => v.id === id)?.copy ?? '')
  }

  async function launch() {
    setPending(true)
    setGated(false)
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
          <CardTitle className="text-sm font-medium">Control (your current copy)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {hypothesis.currentCopy}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Challenger to test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {hypothesis.variants.map((variant, i) => (
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
                Variant {String.fromCharCode(65 + i)}
                {i === 0 ? ' (recommended)' : ''}
              </button>
            ))}
          </div>
          <textarea
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            disabled={pending}
            className={textareaClass}
            data-testid="challenger-copy"
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="panel-label text-[0.7rem] text-muted-foreground">Test length</span>
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
              {days} days
            </button>
          ))}
        </div>
        <Button disabled={pending || !variantId} onClick={launch} data-testid="launch-experiment">
          {pending ? 'Launching...' : 'Launch test'}
        </Button>
      </div>

      {gated && (
        <p className="text-sm text-red">
          You already have a test running. Free plans run one at a time.{' '}
          <Link href="/billing" className="font-medium underline underline-offset-2">
            Upgrade
          </Link>{' '}
          to run more.
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive">Something went wrong launching the test.</p>
      )}
    </div>
  )
}
