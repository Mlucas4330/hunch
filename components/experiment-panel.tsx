'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionBadge } from '@/components/section-badge'
import {
  CONTACT_PATH,
  EXPERIMENT_RECOMMENDATION_BADGE_CLASS,
  EXPERIMENT_STATUS_BADGE_CLASS
} from '@/lib/constants'
import { buildReportMarkdown } from '@/lib/export'
import type { ExperimentAction, ExperimentStatus, Locale, Section } from '@/lib/enums'
import { useI18n } from '@/components/i18n-provider'
import { formatDecimal, t } from '@/lib/i18n/format'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
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
  goalSelector: string | null
  result: ExperimentResult
}

const POLL_INTERVAL = 5000
const DAY_MS = 86_400_000

export function ExperimentPanel({
  experiment,
  url,
  canExport,
  onStatusChange
}: {
  experiment: PanelExperiment
  url: string
  canExport: boolean
  onStatusChange?: (status: ExperimentStatus) => void
}) {
  const { locale, dictionary } = useI18n()
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
      onStatusChange?.(data.experiment.status)
    }, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [state.id, state.status, onStatusChange])

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
        onStatusChange?.(data.experiment.status)
      }
    } finally {
      setBusy(false)
    }
  }

  const report = () =>
    buildReportMarkdown(
      {
        url,
        section: state.section,
        problem: state.problem,
        controlCopy: state.controlCopy,
        variantCopy: state.variantCopy,
        durationDays: state.durationDays,
        result: state.result
      },
      dictionary,
      locale
    )

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
    anchor.download = dictionary.export.filename
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
              {dictionary.labels.experimentStatus[state.status]}
            </span>
            {state.status === 'running' && (
              <span className="text-xs text-muted-foreground">
                {countdown(state.endsAt, dictionary)}
              </span>
            )}
          </div>
          {state.status === 'running' && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act('stop')}>
                {dictionary.experimentPanel.stop}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => act('discard')}>
                {dictionary.experimentPanel.discard}
              </Button>
              <Button size="sm" disabled={busy} onClick={() => act('declare_winner')}>
                {dictionary.experimentPanel.declareWinner}
              </Button>
            </div>
          )}
        </div>
        <CardTitle className="text-sm font-medium text-muted-foreground">{state.problem}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ArmStat
            label={dictionary.labels.experimentArm.control}
            arm={control}
            isLeader={leader === 'control'}
            locale={locale}
          />
          <ArmStat
            label={dictionary.labels.experimentArm.variant}
            arm={variant}
            isLeader={leader === 'variant'}
            locale={locale}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {summary(upliftPct, pValue, significant, dictionary, locale)}
        </p>
        {!state.goalSelector && (
          <p className="text-xs text-amber" data-testid="experiment-no-goal">
            {dictionary.experimentPanel.noGoal}
          </p>
        )}

        {done && (
          <div className="space-y-3 border-t pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="panel-label text-[0.7rem] text-muted-foreground">
                  {dictionary.experimentPanel.recommendation}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    EXPERIMENT_RECOMMENDATION_BADGE_CLASS[recommendation]
                  )}
                  data-testid="experiment-recommendation"
                >
                  {dictionary.labels.experimentRecommendation[recommendation]}
                </span>
              </div>
              {canExport ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={copyReport} data-testid="report-copy">
                    {copied ? dictionary.common.copied : dictionary.experimentPanel.copyReport}
                  </Button>
                  <Button size="sm" onClick={downloadReport} data-testid="report-download">
                    {dictionary.experimentPanel.downloadMd}
                  </Button>
                </div>
              ) : (
                <Button asChild size="sm" variant="outline" data-testid="report-export-upgrade">
                  <Link href={CONTACT_PATH}>{dictionary.experimentPanel.upgradeToExport}</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function countdown(endsAt: string | null, dictionary: Dictionary): string {
  if (!endsAt) return ''
  const remaining = new Date(endsAt).getTime() - Date.now()
  if (remaining <= 0) return dictionary.experimentPanel.finalizing
  const days = Math.ceil(remaining / DAY_MS)
  return t(dictionary.experimentPanel.endsIn, { count: days, days })
}

function ArmStat({
  label,
  arm,
  isLeader,
  locale
}: {
  label: string
  arm: ExperimentResult['control']
  isLeader: boolean
  locale: Locale
}) {
  return (
    <div
      className={cn('rounded-md border p-3', isLeader ? 'border-green bg-green/10' : 'border-border')}
    >
      <p className="panel-label text-[0.7rem] text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold">
        {formatDecimal(arm.rate * 100, locale, 1)}%
      </p>
      <p className="text-xs text-muted-foreground">
        {arm.conversions} / {arm.n}
      </p>
    </div>
  )
}

function summary(
  upliftPct: number | null,
  pValue: number | null,
  significant: boolean,
  dictionary: Dictionary,
  locale: Locale
): string {
  const { experimentPanel } = dictionary
  if (upliftPct === null || pValue === null) return experimentPanel.notEnoughData

  const magnitude = t(experimentPanel.magnitude, {
    value: formatDecimal(Math.abs(upliftPct), locale, 1),
    direction: upliftPct >= 0 ? experimentPanel.lift : experimentPanel.drop
  })
  const vars = { magnitude, pValue: formatDecimal(pValue, locale, 3) }

  return t(significant ? experimentPanel.significant : experimentPanel.notSignificant, vars)
}
