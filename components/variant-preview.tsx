'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { SCRAPE_VIEWPORT } from '@/lib/constants'
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
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'empty'>(
    initialUrl ? 'ready' : 'idle'
  )

  useEffect(() => {
    if (state !== 'idle') return
    let active = true
    setState('loading')
    fetch('/api/report/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embedKey, hypothesisId })
    })
      .then((res) => res.json())
      .then((data: { url: string | null }) => {
        if (!active) return
        if (data.url) {
          setUrl(data.url)
          setState('ready')
        } else {
          setState('empty')
        }
      })
      .catch(() => active && setState('empty'))
    return () => {
      active = false
    }
  }, [state, embedKey, hypothesisId])

  if (state === 'empty') return null

  return (
    <div className="space-y-1">
      <p className="panel-label text-[0.6rem] text-muted-foreground">
        {dictionary.report.appliedToYourPage}
      </p>
      <div className="overflow-hidden rounded-md border bg-muted">
        {state === 'ready' && url ? (
          <Image
            src={url}
            alt={dictionary.report.previewAlt}
            width={SCRAPE_VIEWPORT.width}
            height={SCRAPE_VIEWPORT.height}
            className="h-auto w-full"
          />
        ) : (
          <div className="h-40 w-full animate-pulse bg-muted" />
        )}
      </div>
    </div>
  )
}
