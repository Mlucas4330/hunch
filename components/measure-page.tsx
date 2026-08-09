'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { MEASURE_ESTIMATE_SECONDS, MEASURE_REQUEST_TIMEOUT_MS } from '@/lib/constants'
import { t } from '@/lib/i18n/format'

export function MeasurePage({ analysisId }: { analysisId: string }) {
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
