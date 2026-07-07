'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionBadge } from '@/components/section-badge'
import {
  EXPERIMENT_ARM_LABEL,
  EXPERIMENT_RECOMMENDATION_BADGE_CLASS,
  EXPERIMENT_RECOMMENDATION_LABEL,
  EXPERIMENT_STATUS_BADGE_CLASS,
  EXPERIMENT_STATUS_LABEL
} from '@/lib/constants'
import { buildReportMarkdown } from '@/lib/export'
import type { ExperimentAction, ExperimentStatus, Section } from '@/lib/enums'
import type { ExperimentResult } from '@/lib/stats'
import { cn } from '@/lib/utils'

export type PanelExperiment = {
  id: string
  status: ExperimentStatus
  section: Section
  problem: string
  controlCopy: string
  variantCopy: string
  durationDays: number
  endsAt: string | null
  result: ExperimentResult
}

const POLL_INTERVAL = 5000
const DAY_MS = 86_400_000

export function ExperimentPanel({ experiment, url }: { experiment: PanelExperiment; url: string }) {
  const [state, setState] = useState(experiment)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (state.status !== 'running') return
    const timer = setInterval(async () => {
      const res = await fetch(`/api/experiments/${state.id}`)
      if (!res.ok) return
      const data = await res.json()
      setState((s) => ({ ...s, status: data.experiment.status, result: data.experiment.result }))
    }, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [state.id, state.status])

  async function act(action: ExperimentAction) {
    setBusy(true)
    try {
      const res = await fetch(`/api/experiments/${state.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        const data = await res.json()
        setState((s) => ({ ...s, status: data.experiment.status, result: data.experiment.result }))
      }
    } finally {
      setBusy(false)
    }
  }

  const report = () =>
    buildReportMarkdown({
      url,
      section: state.section,
      problem: state.problem,
      controlCopy: state.controlCopy,
      variantCopy: state.variantCopy,
      durationDays: state.durationDays,
      result: state.result
    })

  async function copyReport() {
    await navigator.clipboard.writeText(report())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadReport() {
    const blob = new Blob([report()], { type: 'text/markdown' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = 'ab-test-report.md'
    anchor.click()
    URL.revokeObjectURL(href)
  }

  const { control, variant, upliftPct, pValue, significant, leader, recommendation } = state.result
  const done = state.status === 'completed' || state.status === 'stopped'

  return (
    <Card data-testid="experiment-panel">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SectionBadge section={state.section} />
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                EXPERIMENT_STATUS_BADGE_CLASS[state.status]
              )}
            >
              {EXPERIMENT_STATUS_LABEL[state.status]}
            </span>
            {state.status === 'running' && (
              <span className="text-xs text-muted-foreground">{countdown(state.endsAt)}</span>
            )}
          </div>
          {state.status === 'running' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act('stop')}>
                Stop
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => act('discard')}>
                Discard
              </Button>
              <Button size="sm" disabled={busy} onClick={() => act('declare_winner')}>
                Declare winner
              </Button>
            </div>
          )}
        </div>
        <CardTitle className="text-sm font-medium text-muted-foreground">{state.problem}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ArmStat label={EXPERIMENT_ARM_LABEL.control} arm={control} isLeader={leader === 'control'} />
          <ArmStat label={EXPERIMENT_ARM_LABEL.variant} arm={variant} isLeader={leader === 'variant'} />
        </div>
        <p className="text-xs text-muted-foreground">{summary(upliftPct, pValue, significant)}</p>

        {done && (
          <div className="space-y-3 border-t pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="panel-label text-[0.7rem] text-muted-foreground">Recommendation</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    EXPERIMENT_RECOMMENDATION_BADGE_CLASS[recommendation]
                  )}
                  data-testid="experiment-recommendation"
                >
                  {EXPERIMENT_RECOMMENDATION_LABEL[recommendation]}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyReport} data-testid="report-copy">
                  {copied ? 'Copied' : 'Copy report'}
                </Button>
                <Button size="sm" onClick={downloadReport} data-testid="report-download">
                  Download .md
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function countdown(endsAt: string | null): string {
  if (!endsAt) return ''
  const remaining = new Date(endsAt).getTime() - Date.now()
  if (remaining <= 0) return 'Finalizing...'
  const days = Math.ceil(remaining / DAY_MS)
  return days === 1 ? 'Ends in 1 day' : `Ends in ${days} days`
}

function ArmStat({
  label,
  arm,
  isLeader
}: {
  label: string
  arm: ExperimentResult['control']
  isLeader: boolean
}) {
  return (
    <div
      className={cn('rounded-md border p-3', isLeader ? 'border-green bg-green/10' : 'border-border')}
    >
      <p className="panel-label text-[0.7rem] text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold">{(arm.rate * 100).toFixed(1)}%</p>
      <p className="text-xs text-muted-foreground">
        {arm.conversions} / {arm.n}
      </p>
    </div>
  )
}

function summary(upliftPct: number | null, pValue: number | null, significant: boolean): string {
  if (upliftPct === null || pValue === null) return 'Not enough data yet.'
  const direction = upliftPct >= 0 ? 'lift' : 'drop'
  const magnitude = `${Math.abs(upliftPct).toFixed(1)}% ${direction}`
  if (significant) return `Significant: ${magnitude} (p=${pValue.toFixed(3)}).`
  return `${magnitude} so far, not yet significant (p=${pValue.toFixed(3)}).`
}
