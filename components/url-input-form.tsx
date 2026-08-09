'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/components/i18n-provider'
import { CONTACT_PATH } from '@/lib/constants'
import { t } from '@/lib/i18n/format'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import type { SubscriptionPlan } from '@/lib/enums'
import { cn } from '@/lib/utils'

const PHASE_SCHEDULE: { at: number; phase: number }[] = [
  { at: 4000, phase: 1 },
  { at: 46000, phase: 2 },
  { at: 160000, phase: 3 }
]

const MAX_COMPETITORS = 3

const textareaClass =
  'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50'

export function UrlInputForm({
  plan,
  defaultBrief = '',
  blocked = false
}: {
  plan: SubscriptionPlan
  defaultBrief?: string
  blocked?: boolean
}) {
  const { dictionary } = useI18n()
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [brief, setBrief] = useState(defaultBrief)
  const [competitors, setCompetitors] = useState<string[]>(['', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [phase, setPhase] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  const isPaid = plan !== 'free'

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      setError(dictionary.urlForm.errorInvalidUrl)
      return
    }

    setPending(true)
    setPhase(0)
    setElapsed(0)
    const startedAt = Date.now()
    const ticker = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    const phaseTimers = PHASE_SCHEDULE.map((step) => setTimeout(() => setPhase(step.phase), step.at))

    const competitorUrls = isPaid
      ? competitors.map((c) => c.trim()).filter(Boolean)
      : []

    try {
      const res = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: parsed.toString(),
          brief: brief.trim() || undefined,
          competitorUrls: competitorUrls.length ? competitorUrls : undefined
        })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(messageFor(dictionary, res.status, body?.error))
        return
      }

      const { analysis } = await res.json()
      router.push(`/analyses/${analysis.id}`)
      router.refresh()
    } catch {
      setError(dictionary.urlForm.errorGeneric)
    } finally {
      clearInterval(ticker)
      phaseTimers.forEach(clearTimeout)
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Input
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

      {pending && (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2">
            <span className="panel-label text-[0.7rem] text-muted-foreground">
              {dictionary.urlForm.phases[phase]}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{dictionary.urlForm.waitNote}</p>
        </div>
      )}

      <details className="rounded-md border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          {dictionary.urlForm.briefSummary}
        </summary>
        <div className="pt-2">
          <textarea
            name="brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            disabled={pending}
            placeholder={dictionary.urlForm.briefPlaceholder}
            className={textareaClass}
          />
        </div>
      </details>

      <details className="rounded-md border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          {dictionary.urlForm.competitorSummary}{' '}
          {!isPaid && (
            <span className="text-[0.7rem]">{dictionary.urlForm.competitorPaidOnly}</span>
          )}
        </summary>
        <div className="space-y-2 pt-2">
          {isPaid ? (
            <>
              <p className="text-xs text-muted-foreground">
                {t(dictionary.urlForm.competitorHint, { max: MAX_COMPETITORS })}
              </p>
              {competitors.map((value, i) => (
                <Input
                  key={i}
                  type="url"
                  placeholder={dictionary.urlForm.competitorPlaceholder}
                  value={value}
                  disabled={pending}
                  className="font-mono"
                  onChange={(e) =>
                    setCompetitors((list) => list.map((v, j) => (j === i ? e.target.value : v)))
                  }
                />
              ))}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {dictionary.urlForm.competitorLockedBefore}{' '}
              <Link href={CONTACT_PATH} className="font-medium underline underline-offset-2">
                {dictionary.common.upgrade}
              </Link>{' '}
              {dictionary.urlForm.competitorLockedAfter}
            </p>
          )}
        </div>
      </details>

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

function messageFor(dictionary: Dictionary, status: number, code?: string): string {
  const { urlForm } = dictionary
  if (status === 403 || code === 'limit_reached') return urlForm.errorLimitReached
  if (status === 422) return urlForm.errorUnsupportedUrl
  if (status === 502) return urlForm.errorScrapeFailed
  return urlForm.errorAnalyzeFailed
}
