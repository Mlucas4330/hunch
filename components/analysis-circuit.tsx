'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { OptionCard } from '@/components/option-card'
import { CircuitSummary } from '@/components/circuit-summary'
import { SECTION_DOT_CLASS } from '@/lib/constants'
import type { PlanStep } from '@/lib/export'
import type { VariantStatus } from '@/lib/enums'
import type { Hypothesis, Variant } from '@/db/schema'
import { cn } from '@/lib/utils'

export type HypothesisWithVariants = Hypothesis & { variants: Variant[] }

type Choice = string | 'current'

type Competitor = { name: string; url: string }

export function AnalysisCircuit({
  url,
  hypotheses,
  competitors
}: {
  url: string
  hypotheses: HypothesisWithVariants[]
  competitors: Competitor[] | null
}) {
  const steps = useMemo(
    () => [...hypotheses].sort((a, b) => b.impactScore - a.impactScore),
    [hypotheses]
  )
  const total = steps.length

  const [choices, setChoices] = useState<Record<string, Choice>>(() => {
    const initial: Record<string, Choice> = {}
    for (const h of steps) {
      const winner = h.variants.find((v) => v.status === 'winner')
      if (winner) initial[h.id] = winner.id
    }
    return initial
  })
  const [stepIndex, setStepIndex] = useState(0)
  const [pending, setPending] = useState(false)

  async function patchVariant(id: string, status: VariantStatus) {
    const res = await fetch(`/api/variants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (!res.ok) throw new Error('patch_failed')
  }

  async function select(hypothesisId: string, value: Choice) {
    const previous = choices[hypothesisId]
    setChoices((c) => ({ ...c, [hypothesisId]: value }))
    setPending(true)

    try {
      if (value !== 'current') await patchVariant(value, 'winner')
      if (previous && previous !== 'current' && previous !== value) {
        await patchVariant(previous, 'proposed')
      }
      setTimeout(() => setStepIndex((i) => Math.min(i + 1, total)), 300)
    } catch {
      setChoices((c) => {
        const next = { ...c }
        if (previous === undefined) delete next[hypothesisId]
        else next[hypothesisId] = previous
        return next
      })
    } finally {
      setPending(false)
    }
  }

  const planSteps: PlanStep[] = steps.map((h) => {
    const choice = choices[h.id]
    const chosen = choice && choice !== 'current' ? h.variants.find((v) => v.id === choice) : null
    return {
      section: h.section,
      problem: h.problem,
      currentCopy: h.currentCopy,
      chosenCopy: chosen?.copy ?? null,
      chosenEvidence: chosen?.evidence ?? null
    }
  })

  const onSummary = stepIndex >= total
  const current = steps[Math.min(stepIndex, total - 1)]

  return (
    <div className="space-y-8">
      {competitors && competitors.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="benchmarked-against">
          Benchmarked against:{' '}
          {competitors.map((competitor, i) => (
            <span key={competitor.url}>
              {i > 0 && ', '}
              <a
                href={competitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {competitor.name}
              </a>
            </span>
          ))}
        </p>
      )}

      <CircuitPath
        steps={steps}
        stepIndex={stepIndex}
        choices={choices}
        onJump={(i) => setStepIndex(i)}
      />

      {onSummary ? (
        <CircuitSummary url={url} steps={planSteps} competitors={competitors ?? []} />
      ) : (
        <div key={stepIndex} className="animate-fade-up space-y-5" data-testid="circuit-step">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SectionBadge section={current.section} />
              <span className="panel-label text-[0.7rem] text-muted-foreground">
                Section {String(stepIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
            </div>
            <div className="flex gap-2">
              <ScoreIndicator label="Impact" score={current.impactScore} kind="impact" />
              <ScoreIndicator label="Effort" score={current.effortScore} kind="effort" />
            </div>
          </div>

          <h2 className="font-display text-xl font-semibold leading-snug tracking-tight">
            {current.problem}
          </h2>
          <p className="text-sm text-muted-foreground">Pick one to advance to the next section.</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {current.variants.map((variant, i) => (
              <OptionCard
                key={variant.id}
                label={`Variant ${i + 1}`}
                copy={variant.copy}
                evidence={variant.evidence}
                section={current.section}
                selected={choices[current.id] === variant.id}
                disabled={pending}
                onSelect={() => select(current.id, variant.id)}
              />
            ))}
            <OptionCard
              label="No change"
              copy={current.currentCopy}
              section={current.section}
              selected={choices[current.id] === 'current'}
              disabled={pending}
              onSelect={() => select(current.id, 'current')}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            >
              Back
            </Button>
            <Button
              variant="outline"
              disabled={choices[current.id] === undefined}
              onClick={() => setStepIndex((i) => Math.min(i + 1, total))}
            >
              {stepIndex === total - 1 ? 'Review plan' : 'Next'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function CircuitPath({
  steps,
  stepIndex,
  choices,
  onJump
}: {
  steps: HypothesisWithVariants[]
  stepIndex: number
  choices: Record<string, Choice>
  onJump: (index: number) => void
}) {
  const total = steps.length

  return (
    <div className="flex items-center">
      {steps.map((h, i) => {
        const decided = choices[h.id] !== undefined
        const isCurrent = i === stepIndex
        const active = decided || isCurrent
        return (
          <div key={h.id} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              data-testid="circuit-node"
              aria-label={`Go to section ${i + 1}`}
              onClick={() => onJump(i)}
              className={cn(
                'h-4 w-4 shrink-0 rounded-full border transition-all',
                active ? SECTION_DOT_CLASS[h.section] : 'bg-muted',
                isCurrent && 'ring-2 ring-offset-2 ring-ring'
              )}
            />
            {i < total - 1 && (
              <div
                className={cn('mx-1 h-px flex-1', i < stepIndex ? 'bg-foreground' : 'bg-border')}
              />
            )}
          </div>
        )
      })}
      <div className={cn('mx-1 h-px flex-1', stepIndex >= total ? 'bg-foreground' : 'bg-border')} />
      <button
        type="button"
        data-testid="circuit-node"
        aria-label="Go to summary"
        onClick={() => onJump(total)}
        className={cn(
          'h-4 w-4 shrink-0 rounded-full border transition-all',
          stepIndex >= total ? 'bg-foreground' : 'bg-muted',
          stepIndex >= total && 'ring-2 ring-offset-2 ring-ring'
        )}
      />
    </div>
  )
}
