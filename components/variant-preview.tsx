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

// Rendering a preview boots a browser against the customer's real page, so it is never speculative:
// nothing is requested until the reader asks for this one. Mounting three of these on a cold report
// used to launch three browsers before anyone had scrolled to them.
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

  // Bounded because the server's worst case is minutes, not the seconds the hint promises, and a
  // pulsing skeleton with no end is worse than an error with a retry. Aborting does not cancel the
  // render: nothing reads request.signal, so it finishes and caches, and the retry click returns it
  // immediately. The timeout buys the reader an answer, not a smaller bill.
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
            // A cached screenshot_url is server-rendered straight into initialUrl, so this is the
            // only place a file that has been pruned, lost with its volume, or left truncated by an
            // interrupted write can be caught -- the POST route never runs on that path. Falling
            // back to the button re-renders it on demand instead of showing a broken image on the
            // one surface a prospect sees.
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

      {/* The reader clicked, so silence would read as a broken button. */}
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
