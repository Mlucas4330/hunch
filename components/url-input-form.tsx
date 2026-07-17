'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const PHASES = [
  'Scraping your page...',
  'Researching competitors...',
  'Writing your test ideas...',
  'Saving results...'
] as const

// Paced to the real pipeline (scrape ~4s, web-search ~42s, generation ~67s) so the label
// tracks what is actually happening instead of claiming "saving" for two minutes.
const PHASE_SCHEDULE: { at: number; label: (typeof PHASES)[number] }[] = [
  { at: 4000, label: PHASES[1] },
  { at: 46000, label: PHASES[2] },
  { at: 160000, label: PHASES[3] }
]

const MAX_COMPETITORS = 3

const textareaClass =
  'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50'

export function UrlInputForm({ defaultBrief = '' }: { defaultBrief?: string }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [brief, setBrief] = useState(defaultBrief)
  const [competitors, setCompetitors] = useState<string[]>(['', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [phase, setPhase] = useState<(typeof PHASES)[number]>(PHASES[0])
  const [elapsed, setElapsed] = useState(0)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      setError('Enter a valid URL, including https://')
      return
    }

    setPending(true)
    setPhase(PHASES[0])
    setElapsed(0)
    const startedAt = Date.now()
    const ticker = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    const phaseTimers = PHASE_SCHEDULE.map(({ at, label }) => setTimeout(() => setPhase(label), at))

    const competitorUrls = competitors.map((c) => c.trim()).filter(Boolean)

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
        setError(messageFor(res.status))
        return
      }

      const { analysis } = await res.json()
      router.push(`/analyses/${analysis.id}`)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
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
          placeholder="https://your-landing-page.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={pending}
          className="font-mono"
          aria-invalid={error ? true : undefined}
          required
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? 'Analyzing...' : 'Analyze'}
        </Button>
      </div>

      {pending && (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2">
            <span className="panel-label text-[0.7rem] text-muted-foreground">{phase}</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            This usually takes 2 to 3 minutes. Keep this tab open while we scrape the page, study
            competitors, and write your tests.
          </p>
        </div>
      )}

      <details className="rounded-md border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Add business details (optional)
        </summary>
        <div className="pt-2">
          <textarea
            name="brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            disabled={pending}
            placeholder="Who it's for, your real numbers (users, trial length, pricing), and what makes you different. We use these to write finished copy instead of placeholders."
            className={textareaClass}
          />
        </div>
      </details>

      <details className="rounded-md border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm text-muted-foreground">Competitor mode</summary>
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">
            Paste up to {MAX_COMPETITORS} competitor landing pages to ground your hunches. Leave
            blank to find competitors automatically.
          </p>
          {competitors.map((value, i) => (
            <Input
              key={i}
              type="url"
              placeholder="https://a-competitor.com"
              value={value}
              disabled={pending}
              className="font-mono"
              onChange={(e) =>
                setCompetitors((list) => list.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
          ))}
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

function messageFor(status: number): string {
  if (status === 422) return 'That URL is not valid or supported.'
  if (status === 502) return 'We could not load that page. Check the URL and try again.'
  return 'Something went wrong while analyzing. Please try again.'
}
