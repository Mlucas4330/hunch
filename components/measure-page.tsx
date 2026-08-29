'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { MEASURE_ESTIMATE_SECONDS, MEASURE_REQUEST_TIMEOUT_MS } from '@/lib/constants'
import { t } from '@/lib/i18n/format'

/**
 * The owner's three ways of asking for a measurement, all posting to the same route.
 *
 * - `backfill` is the whole section, for an analysis that has no readout at all.
 * - `again` is the bare button, and it lives in the page header. **Re-measuring is the action an
 *   owner repeats most and it used to sit below the entire readout**, which is the last place they
 *   reach. There is no width for `againHint` up there and no need for it either: that sentence
 *   explains what a re-measure costs, which is read once rather than every visit.
 * - `trend_start` is the dashed panel naming what a second measurement unlocks, for the owner who
 *   has never pressed the button. It is a section, not a control, so it does not go in a header row
 *   and the page renders it separately -- which is why this component no longer takes a `hasHistory`
 *   flag. Whether there is a history is the page's question and only the page has the answer.
 *
 * See docs/analysis-ui.md.
 */
export function MeasurePage({
  analysisId,
  variant = 'backfill'
}: {
  analysisId: string
  variant?: 'backfill' | 'again' | 'trend_start'
}) {
  const router = useRouter()
  const { dictionary } = useI18n()
  const copy = dictionary.readout
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  async function measure() {
    setState('loading')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), MEASURE_REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(`/api/analyses/${analysisId}/measure`, {
        method: 'POST',
        signal: controller.signal
      })
      if (!res.ok) {
        setState('error')
        return
      }
      router.refresh()
    } catch {
      setState('error')
    } finally {
      clearTimeout(timer)
    }
  }

  if (variant === 'again') {
    return (
      <div className="flex flex-wrap items-center gap-2 print:hidden" data-testid="measure-again">
        <Button
          variant="outline"
          size="sm"
          onClick={measure}
          disabled={state === 'loading'}
          aria-busy={state === 'loading'}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {state === 'loading' ? copy.measure.loading : copy.measure.again}
        </Button>
        {state === 'error' && <p className="text-xs text-coral">{copy.measure.failed}</p>}
      </div>
    )
  }

  // **With one measurement there is no trend, and the trend says nothing about why.** Both the
  // sparkline and the per-finding deltas return null below two snapshots, so an owner who has never
  // pressed the button sees no evidence that a history exists at all -- the feature is built and
  // invisible to almost everyone. This state names it instead of rendering nothing.
  if (variant === 'trend_start') {
    return (
      <div
        className="space-y-3 rounded-lg border border-dashed p-4 print:hidden"
        data-testid="measure-trend-start"
      >
        <div className="space-y-1">
          <p className="font-display text-sm font-bold tracking-tight">
            {copy.measure.trendStartTitle}
          </p>
          <p className="text-sm text-muted-foreground">
            {state === 'error' ? copy.measure.failed : copy.measure.trendStartBody}
          </p>
        </div>

        <Button onClick={measure} disabled={state === 'loading'} aria-busy={state === 'loading'}>
          {state === 'loading' ? copy.measure.loading : copy.measure.again}
        </Button>
      </div>
    )
  }

  return (
    <section className="space-y-4" data-testid="measure-page">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight">{copy.title}</h2>
          <InfoHint label={copy.hintLabel}>
            <RichText>{copy.hint}</RichText>
          </InfoHint>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <p className="text-sm text-muted-foreground">{copy.measure.explain}</p>

        {state === 'error' ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{copy.measure.failed}</p>
            <Button variant="outline" size="sm" onClick={() => setState('idle')}>
              {copy.measure.retry}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={measure}
              disabled={state === 'loading'}
              aria-busy={state === 'loading'}
            >
              {state === 'loading' ? copy.measure.loading : copy.measure.cta}
            </Button>
            {state === 'loading' ? (
              <div className="h-16 w-full animate-pulse rounded-md border bg-muted" />
            ) : (
              <p className="text-xs text-muted-foreground">
                {t(copy.measure.hint, { seconds: MEASURE_ESTIMATE_SECONDS })}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
