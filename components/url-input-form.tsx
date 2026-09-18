'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnalysisProgress } from '@/components/analysis-progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/components/i18n-provider'
import { ANALYSIS_WAIT_MAX_MS, JOB_POLL_INTERVAL_MS, URL_FIELD_ID } from '@/lib/constants'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

// Ties the competitor field to its own message via `aria-describedby`, so the error is announced
// with the input rather than as a loose alert somewhere else in the form.
const COMPETITOR_ERROR_ID = 'competitor-url-error'

type Progress = { measured: boolean }

/**
 * Polls until the page has been measured, and then leaves. The error lists carry on generating and
 * the report screen fills itself in. Gives up on the wall clock rather than a retry count.
 */
async function waitForAnalysis(embedKey: string): Promise<boolean> {
  const deadline = Date.now() + ANALYSIS_WAIT_MAX_MS

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, JOB_POLL_INTERVAL_MS))

    try {
      const res = await fetch(`/api/analyses?embedKey=${embedKey}`)
      if (!res.ok) continue

      const progress: Progress = await res.json()
      if (progress.measured) return true
    } catch {
      // A dropped poll is not a verdict: the worker still holds the job.
    }
  }

  return false
}

export function UrlInputForm({ blocked = false }: { blocked?: boolean }) {
  const { dictionary } = useI18n()
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [competitorUrl, setCompetitorUrl] = useState('')
  // Two error slots, because there are two fields: a malformed competitor URL renders under that
  // field and marks that input invalid, never the page URL.
  const [error, setError] = useState<string | null>(null)
  const [competitorError, setCompetitorError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  // The key of the analysis being waited on, which is what the progress screen polls. Set the moment
  // the route answers, so the wait is drawn from the run itself rather than from this form's clock.
  const [waitingFor, setWaitingFor] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setCompetitorError(null)

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      setError(dictionary.urlForm.errorInvalidUrl)
      return
    }

    let competitor: URL | null = null
    if (competitorUrl.trim()) {
      try {
        competitor = new URL(competitorUrl.trim())
      } catch {
        setCompetitorError(dictionary.urlForm.errorInvalidCompetitor)
        return
      }
    }

    setPending(true)
    setWaitingFor(null)

    try {
      const res = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parsed.toString(), competitorUrl: competitor?.toString() })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(messageFor(dictionary, res.status, body?.error))
        return
      }

      const { embedKey }: { embedKey: string } = await res.json()
      setWaitingFor(embedKey)

      const done = await waitForAnalysis(embedKey)
      if (!done) {
        setError(dictionary.urlForm.errorGeneric)
        return
      }

      router.push(`/r/${embedKey}`)
    } catch {
      setError(dictionary.urlForm.errorGeneric)
    } finally {
      setPending(false)
      setWaitingFor(null)
    }
  }

  return (
    <form onSubmit={onSubmit} className="@container space-y-3">
      <div className="space-y-1">
        <label htmlFor={URL_FIELD_ID} className="panel-label text-nano text-muted-foreground">
          {dictionary.urlForm.urlLabel}
        </label>
        <div className="flex flex-col gap-2 @md:flex-row">
          <Input
            id={URL_FIELD_ID}
            name="url"
            type="url"
            placeholder={dictionary.urlForm.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={pending || blocked}
            className="font-mono"
            aria-invalid={error ? true : undefined}
            required
          />
          <Button type="submit" disabled={pending || blocked} className="shrink-0">
            {pending ? dictionary.urlForm.analyzing : dictionary.urlForm.analyze}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="competitorUrl" className="panel-label text-nano text-muted-foreground">
          {dictionary.urlForm.competitorLabel}
        </label>
        <Input
          id="competitorUrl"
          name="competitorUrl"
          type="url"
          placeholder={dictionary.urlForm.competitorPlaceholder}
          value={competitorUrl}
          onChange={(e) => setCompetitorUrl(e.target.value)}
          disabled={pending || blocked}
          className="font-mono"
          aria-invalid={competitorError ? true : undefined}
          aria-describedby={competitorError ? COMPETITOR_ERROR_ID : undefined}
        />
        {competitorError ? (
          <p id={COMPETITOR_ERROR_ID} role="alert" className="text-xs text-destructive">
            {competitorError}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{dictionary.urlForm.competitorHint}</p>
        )}
      </div>

      {pending &&
        (waitingFor ? (
          <AnalysisProgress
            embedKey={waitingFor}
            url={url}
            waiting="measuring"
            variant="inline"
          />
        ) : (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {dictionary.urlForm.measuring}
          </p>
        ))}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

// The statuses this route actually answers with. See app/api/analyses/route.ts.
function messageFor(dictionary: Dictionary, status: number, code?: string): string {
  const { urlForm } = dictionary
  if (status === 403 || code === 'quota_exhausted') return urlForm.errorQuotaExhausted
  if (status === 429) return urlForm.errorLimitReached
  if (status === 422) return urlForm.errorUnsupportedUrl
  if (status === 502) return urlForm.errorScrapeFailed
  if (status === 503 || code === 'queue_unavailable') return urlForm.errorBusy
  return urlForm.errorAnalyzeFailed
}
