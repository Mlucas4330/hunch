'use client'

import { useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import {
  PREVIEW_ESTIMATE_SECONDS,
  PREVIEW_REQUEST_TIMEOUT_MS,
  SCRAPE_VIEWPORT
} from '@/lib/constants'
import { t } from '@/lib/i18n/format'
import Image from 'next/image'

export function VariantPreview({
  embedKey,
  hypothesisId,
  initialUrl
}: {
  embedKey: string
  hypothesisId: string
  initialUrl: string | null
}) {
  const { dictionary } = useI18n()
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    initialUrl ? 'ready' : 'idle'
  )

  async function render() {
    setState('loading')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PREVIEW_REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch('/api/report/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedKey, hypothesisId }),
        signal: controller.signal
      })
      const data: { url: string | null } = await res.json()
      if (!data.url) {
        setState('error')
        return
      }
      setUrl(data.url)
      setState('ready')
    } catch {
      setState('error')
    } finally {
      clearTimeout(timer)
    }
  }

  return (
    <div className="space-y-1" data-testid="variant-preview">
      <p className="panel-label text-[0.6rem] text-muted-foreground">
        {dictionary.report.appliedToYourPage}
      </p>

      {state === 'ready' && url ? (
        <div className="overflow-hidden rounded-md border bg-muted">
          <Image
            src={url}
            alt={dictionary.report.previewAlt}
            width={SCRAPE_VIEWPORT.width}
            height={SCRAPE_VIEWPORT.height}
            className="h-auto w-full"
            onError={() => {
              setUrl(null)
              setState('idle')
            }}
          />
        </div>
      ) : null}

      {state === 'idle' || state === 'loading' ? (
        <div className="space-y-2">
          <Button variant="outline" size="sm" onClick={render} disabled={state === 'loading'}>
            {state === 'loading' ? dictionary.report.previewLoading : dictionary.report.previewCta}
          </Button>
          {state === 'loading' ? (
            <div
              className="h-40 w-full animate-pulse rounded-md border bg-muted"
              aria-busy="true"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {t(dictionary.report.previewHint, { seconds: PREVIEW_ESTIMATE_SECONDS })}
            </p>
          )}
        </div>
      ) : null}

      {state === 'error' ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{dictionary.report.previewUnavailable}</p>
          <Button variant="outline" size="sm" onClick={() => setState('idle')}>
            {dictionary.report.previewRetry}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
