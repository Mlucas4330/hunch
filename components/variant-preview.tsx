'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import {
  JOB_POLL_INTERVAL_MS,
  PREVIEW_ESTIMATE_SECONDS,
  PREVIEW_REQUEST_TIMEOUT_MS,
  SCRAPE_VIEWPORT
} from '@/lib/constants'
import { t } from '@/lib/i18n/format'
import type { JobStatus } from '@/lib/enums'
import Image from 'next/image'

type Response = { status: JobStatus; url: string | null; overflow?: boolean }

// Four states, and the split between the last two is the whole point of the queue. `waiting` means
// the work is queued or running and will arrive; `error` means it never can. Both used to reach the
// reader as the same broken button, because a preview that lost the race for a browser slot was
// indistinguishable from one that was impossible. See docs/scraping.md.
type State = 'idle' | 'waiting' | 'ready' | 'error'

export function VariantPreview({
  embedKey,
  hypothesisId,
  initialUrl,
  initialOverflow = false
}: {
  embedKey: string
  hypothesisId: string
  initialUrl: string | null
  initialOverflow?: boolean
}) {
  const { dictionary } = useI18n()
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [overflow, setOverflow] = useState(initialOverflow)
  const [state, setState] = useState<State>(initialUrl ? 'ready' : 'idle')
  const polling = useRef<ReturnType<typeof setTimeout> | null>(null)

  // A poll left running after the card unmounts keeps hitting the route for a preview nobody is
  // looking at any more.
  useEffect(() => {
    return () => {
      if (polling.current) clearTimeout(polling.current)
    }
  }, [])

  function settle(data: Response) {
    if (data.status === 'ready' && data.url) {
      setUrl(data.url)
      setOverflow(data.overflow ?? false)
      setState('ready')
      return true
    }
    if (data.status === 'unavailable') {
      setState('error')
      return true
    }
    return false
  }

  async function poll() {
    try {
      const params = new URLSearchParams({ embedKey, hypothesisId })
      const res = await fetch(`/api/report/screenshot?${params}`)
      const data: Response = await res.json()
      if (settle(data)) return
    } catch {
      // A dropped poll is not a verdict: the worker is still holding the job, so try again rather
      // than telling the reader the preview failed.
    }
    polling.current = setTimeout(poll, JOB_POLL_INTERVAL_MS)
  }

  async function render() {
    setState('waiting')

    // The POST normally returns the instant the job is queued, so this deadline is not for the
    // happy path. It is for the one where Redis is unreachable and the route renders inline
    // instead, holding the connection for the whole scrape -- which is the case the constant was
    // derived from. The polls below get no deadline: they are cheap and retrying is the point.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PREVIEW_REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch('/api/report/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedKey, hypothesisId }),
        signal: controller.signal
      })
      const data: Response = await res.json()
      if (settle(data)) return
    } catch {
      setState('error')
      return
    } finally {
      clearTimeout(timer)
    }

    polling.current = setTimeout(poll, JOB_POLL_INTERVAL_MS)
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

      {state === 'ready' && url && overflow ? (
        <p className="text-xs text-amber">{dictionary.report.previewOverflow}</p>
      ) : null}

      {state === 'idle' || state === 'waiting' ? (
        <div className="space-y-2">
          <Button variant="outline" size="sm" onClick={render} disabled={state === 'waiting'}>
            {state === 'waiting' ? dictionary.report.previewLoading : dictionary.report.previewCta}
          </Button>
          {state === 'waiting' ? (
            <div className="h-40 w-full animate-pulse rounded-md border bg-muted" aria-busy="true" />
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
