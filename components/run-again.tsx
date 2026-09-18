'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'
import { useAnalysisPoll } from '@/components/use-analysis-poll'
import { Button } from '@/components/ui/button'

/**
 * The owner's "Run again": a new measure-and-generate pass on the same report, spending one run of
 * the month.
 *
 * - `again` is the bare button in the page header, where an owner reaches for it.
 * - `trend_start` is the dashed panel naming what a second run adds, for the owner who has never
 *   pressed it. It is a section, not a control, so the page renders it separately.
 *
 * `blocked` means the month's quota is spent: the button stays visible and disabled, with the reason
 * beside it. The route refuses anyway. See docs/analysis-ui.md.
 */
export function RunAgain({
  analysisId,
  variant = 'again',
  blocked = false
}: {
  analysisId: string
  variant?: 'again' | 'trend_start'
  blocked?: boolean
}) {
  const router = useRouter()
  const { dictionary } = useI18n()
  const copy = dictionary.readout.run
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'exhausted'>('idle')

  async function run() {
    setState('loading')

    try {
      const res = await fetch(`/api/analyses/${analysisId}/runs`, { method: 'POST' })
      if (res.status === 403) {
        setState('exhausted')
        return
      }
      if (!res.ok) {
        setState('error')
        return
      }
      setState('idle')
      router.refresh()
    } catch {
      setState('error')
    }
  }

  const disabled = blocked || state === 'loading'
  const note = blocked || state === 'exhausted' ? copy.quotaExhausted : state === 'error' ? copy.failed : null

  const button = (
    <Button
      variant={variant === 'again' ? 'outline' : 'default'}
      size={variant === 'again' ? 'sm' : 'default'}
      onClick={run}
      disabled={disabled}
      aria-busy={state === 'loading'}
    >
      {variant === 'again' && <RotateCcw className="size-3.5" aria-hidden="true" />}
      {state === 'loading' ? copy.loading : copy.again}
    </Button>
  )

  if (variant === 'trend_start') {
    return (
      <div
        className="space-y-3 rounded-lg border border-dashed p-4 print:hidden"
        data-testid="run-again-trend-start"
      >
        <div className="space-y-1">
          <p className="font-display text-sm font-bold tracking-tight">{copy.trendStartTitle}</p>
          <p className="text-sm text-muted-foreground">{note ?? copy.trendStartBody}</p>
        </div>
        {button}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden" data-testid="run-again">
      {button}
      {note && <p className="text-xs text-coral">{note}</p>}
    </div>
  )
}

/**
 * Stands where the button was while a new run replaces the lists. The lists below stay on screen
 * until the run lands, then one refresh swaps them.
 */
export function RunInProgress({ embedKey }: { embedKey: string }) {
  const { dictionary } = useI18n()
  const { stalled } = useAnalysisPoll(embedKey, 'rerunning')

  return (
    <p
      className="text-xs text-muted-foreground print:hidden"
      role="status"
      aria-live="polite"
      data-testid="run-in-progress"
    >
      {stalled ? dictionary.report.generating.stalled : dictionary.readout.run.inProgress}
    </p>
  )
}
