'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { BULK_PATH, BULK_URLS_MAX } from '@/lib/constants'
import { parseBulkUrls } from '@/lib/bulk'
import { t } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

type Failure = 'invalid_urls' | 'too_many_urls' | 'invalid_url' | 'quota_exhausted' | 'forbidden' | 'failed'

/**
 * A textarea of URLs, one per line.
 *
 * The count under it is read with the same `parseBulkUrls` the route uses, so what the reader is told
 * they are about to spend is what they will be charged. Nothing here decides whether the batch is
 * allowed: the route re-checks the tier, the URLs and the quota.
 */
export function BulkForm({ remaining }: { remaining: number }) {
  const { dictionary } = useI18n()
  const copy = dictionary.bulk
  const router = useRouter()
  const [urls, setUrls] = useState('')
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)

  const parsed = parseBulkUrls(urls)
  const count = parsed.ok ? parsed.urls.length : parsed.count
  const overQuota = count > remaining

  async function submit() {
    setPending(true)
    setFailure(null)

    try {
      const response = await fetch('/api/analyses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      })

      const body = (await response.json().catch(() => null)) as
        | { batchId?: string; error?: Failure }
        | null

      if (response.ok && body?.batchId) {
        setUrls('')
        router.push(`${BULK_PATH}?batch=${body.batchId}`)
        router.refresh()
        return
      }

      setFailure(body?.error ?? 'failed')
    } catch {
      setFailure('failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="panel-label text-micro text-muted-foreground">{copy.label}</span>
        <textarea
          name="urls"
          rows={8}
          value={urls}
          onChange={(event) => setUrls(event.target.value)}
          placeholder={copy.placeholder}
          className="w-full rounded-md border bg-transparent p-3 font-mono text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={pending || count === 0 || overQuota}>
          {pending ? copy.submitting : t(copy.submit, { count })}
        </Button>
        <p
          className={cn('text-sm', overQuota ? 'text-amber' : 'text-muted-foreground')}
          data-testid="bulk-count"
        >
          {overQuota
            ? t(copy.overQuota, { count, remaining })
            : t(copy.willSpend, { count, max: BULK_URLS_MAX })}
        </p>
      </div>

      {failure && (
        <p role="status" aria-live="polite" className="text-sm text-destructive">
          {copy.errors[failure]}
        </p>
      )}
    </div>
  )
}
