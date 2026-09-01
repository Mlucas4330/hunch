'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BriefWizard } from '@/components/brief-wizard'
import { useI18n } from '@/components/i18n-provider'
import { composeBrief, parseBrief } from '@/lib/brief'
import {
  ANALYSIS_WAIT_MAX_MS,
  ANONYMOUS_ANALYSES_KEY,
  JOB_POLL_INTERVAL_MS
} from '@/lib/constants'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import { cn } from '@/lib/utils'

// Ties the competitor field to its own message via `aria-describedby`, so the error is announced
// with the input rather than as a loose alert somewhere else in the form.
const COMPETITOR_ERROR_ID = 'competitor-url-error'

type Started = { embedKey: string; owned: boolean }

type Progress = { measured: boolean; generated: boolean }

/**
 * An anonymous analysis has no owner, so the only thing tying it to the person who started it is the
 * key their browser is holding. Remembering it here is what lets a later sign-in claim it.
 */
function remember(embedKey: string): void {
  try {
    const seen: string[] = JSON.parse(localStorage.getItem(ANONYMOUS_ANALYSES_KEY) ?? '[]')
    if (!seen.includes(embedKey)) {
      localStorage.setItem(ANONYMOUS_ANALYSES_KEY, JSON.stringify([...seen, embedKey]))
    }
  } catch {
    // A browser refusing localStorage costs the claim, never the analysis.
  }
}

/**
 * Polls until the page has been measured, and then leaves.
 *
 * **It used to wait for `generated` when the analysis had an owner, and that was the whole problem.**
 * `runAnalysis` now stores the readout the moment the scrape returns, so `measured` turns true about
 * twenty seconds in for everybody -- and the score is the half the reader can check against their own
 * site, which makes it the worst possible thing to sit on. The fixes carry on generating and the
 * report screen fills itself in; see app/(report)/r/[embedKey]/page.tsx.
 *
 * Gives up on the wall clock rather than a retry count, because what matters is how long the reader
 * has been staring at a spinner.
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

export function UrlInputForm({
  defaultBrief = '',
  blocked = false,
  submitLabel,
  showBrief = true
}: {
  defaultBrief?: string
  blocked?: boolean
  /** The landing hero carries the page's own CTA wording; everywhere else uses the neutral one. */
  submitLabel?: string
  /**
   * Whether this form runs where a credit is actually spent.
   *
   * The brief only reaches a prompt on a run that generates, and an ownerless run never does — so on
   * the landing page it would be four questions asked of someone whose answers nothing will read.
   * The competitor field is gated on exactly the same fact for exactly the same reason: only the
   * owned branch of `runAnalysis` measures a second page, so offering the field to the hero would
   * take a URL and quietly ignore it.
   */
  showBrief?: boolean
}) {
  const { dictionary } = useI18n()
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [competitorUrl, setCompetitorUrl] = useState('')
  // Parsed once from the string the column holds, so a brief written before the form had fields
  // opens in the form rather than disappearing behind it. See lib/brief.ts.
  const [brief, setBrief] = useState(() => parseBrief(defaultBrief))
  // **Two error slots, because there are two fields.**
  //
  // There was one, shared. A malformed competitor URL therefore printed its message at the bottom of
  // the form -- below the pending strip and below the brief disclosure, a long way from the field
  // that caused it -- and set `aria-invalid` on the *other* input, so a screen reader was told the
  // page URL was wrong when it was fine. `error` is now the form's own outcome (the submit, the
  // route, the wait) and `competitorError` belongs to that field and renders under it.
  const [error, setError] = useState<string | null>(null)
  const [competitorError, setCompetitorError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [elapsed, setElapsed] = useState(0)

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

    // Parsed here so a typo in an optional field is a message under that field rather than a 422
    // from the route after the reader has already committed to the run.
    let competitor: URL | null = null
    if (showBrief && competitorUrl.trim()) {
      try {
        competitor = new URL(competitorUrl.trim())
      } catch {
        setCompetitorError(dictionary.urlForm.errorInvalidCompetitor)
        return
      }
    }

    setPending(true)
    setElapsed(0)
    const startedAt = Date.now()
    const ticker = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)

    try {
      const res = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: parsed.toString(),
          brief: composeBrief(brief) || undefined,
          competitorUrl: competitor?.toString()
        })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(messageFor(dictionary, res.status, body?.error))
        return
      }

      // The route answers 202 with a key, not a finished analysis: the work is on the queue and the
      // wait belongs to the worker now. What is left here is asking until it lands.
      const { embedKey }: Started = await res.json()
      remember(embedKey)

      const done = await waitForAnalysis(embedKey)
      if (!done) {
        setError(dictionary.urlForm.errorGeneric)
        return
      }

      // One destination for both, because there is one screen: the embed key addresses a row whether
      // or not anybody owns it, and the page turns the owner-only affordances on by itself.
      router.push(`/r/${embedKey}`)
    } catch {
      setError(dictionary.urlForm.errorGeneric)
    } finally {
      clearInterval(ticker)
      setPending(false)
    }
  }

  return (
    // **The row is decided by the form's own width, not the viewport's.** This renders both in the
    // dashboard, where it has the whole column, and in the landing hero, where it has a grid track of
    // about 450px next to the readout card -- and a viewport breakpoint cannot tell those apart, so
    // `sm:flex-row` put a full length CTA beside the URL field and left the field at 200px on every
    // desktop from 1024 to 1920. A container query asks the question that actually matters.
    <form onSubmit={onSubmit} className="@container space-y-3">
      {/* The label the competitor field below has always had, on the field that actually matters.
          It was a placeholder alone, which our own readout counts as a field without a label -- and
          `labelled()` in lib/scrape.ts says why in a sentence: a placeholder disappears the moment
          the visitor types, so the field they are halfway through has nothing next to it saying what
          it wanted. An `aria-label` would have satisfied the count and left that half unfixed. */}
      <div className="space-y-1">
        <label htmlFor="url" className="panel-label text-nano text-muted-foreground">
          {dictionary.urlForm.urlLabel}
        </label>
        <div className="flex flex-col gap-2 @md:flex-row">
          <Input
            id="url"
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
            {pending ? dictionary.urlForm.analyzing : (submitLabel ?? dictionary.urlForm.analyze)}
          </Button>
        </div>
      </div>

      {showBrief && (
        <div className="space-y-1">
          <label
            htmlFor="competitorUrl"
            className="panel-label text-nano text-muted-foreground"
          >
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
      )}

      {pending && (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2">
            <span className="panel-label text-micro text-muted-foreground">
              {dictionary.urlForm.measuring}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{dictionary.urlForm.waitNote}</p>
        </div>
      )}

      {showBrief && (
        <details className="rounded-md border border-border px-3 py-2">
          <summary className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {dictionary.urlForm.briefSummary}
          </summary>
          <div className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">{dictionary.urlForm.briefIntro}</p>
            <BriefWizard
              value={brief}
              onChange={setBrief}
              disabled={pending}
              copy={dictionary.urlForm}
            />
          </div>
        </details>
      )}

      {error && (
        <p className={cn('text-sm text-destructive')} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

// The statuses this route actually answers with, which is not what this used to check. It mapped
// `403` and a `limit_reached` code, and `enforceRateLimit` has always answered **429** with
// `rate_limited` -- so the one error a reader is most likely to see, having run a few analyses in a
// row, reached them as "something went wrong while analyzing". See lib/rate-limit.ts.
function messageFor(dictionary: Dictionary, status: number, code?: string): string {
  const { urlForm } = dictionary
  if (status === 429) return urlForm.errorLimitReached
  if (status === 422) return urlForm.errorUnsupportedUrl
  if (status === 502) return urlForm.errorScrapeFailed
  // Redis is down, so there is no queue: the work was never started rather than started and lost.
  if (status === 503 || code === 'queue_unavailable') return urlForm.errorBusy
  return urlForm.errorAnalyzeFailed
}
