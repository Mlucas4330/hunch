'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SubscriptionPlan } from '@/lib/enums'
import { cn } from '@/lib/utils'

const PHASES = ['Scraping page...', 'Analyzing copy...', 'Saving results...'] as const
const MAX_COMPETITORS = 3

const textareaClass =
  'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50'

export function UrlInputForm({
  plan,
  defaultBrief = ''
}: {
  plan: SubscriptionPlan
  defaultBrief?: string
}) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [brief, setBrief] = useState(defaultBrief)
  const [competitors, setCompetitors] = useState<string[]>(['', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [phase, setPhase] = useState<(typeof PHASES)[number]>(PHASES[0])

  const isPaid = plan !== 'free'

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
    const tick = setTimeout(() => setPhase(PHASES[1]), 600)
    const tock = setTimeout(() => setPhase(PHASES[2]), 1200)

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
        setError(messageFor(res.status, body?.error))
        return
      }

      const { analysis } = await res.json()
      router.push(`/analyses/${analysis.id}`)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      clearTimeout(tick)
      clearTimeout(tock)
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
          {pending ? <span className="panel-label text-[0.7rem]">{phase}</span> : 'Analyze'}
        </Button>
      </div>

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
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Competitor mode {!isPaid && <span className="text-[0.7rem]">(Solo & Team)</span>}
        </summary>
        <div className="space-y-2 pt-2">
          {isPaid ? (
            <>
              <p className="text-xs text-muted-foreground">
                Paste up to {MAX_COMPETITORS} competitor landing pages to ground your hunches.
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
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ground your hunches on competitors you choose.{' '}
              <Link href="/billing" className="font-medium underline underline-offset-2">
                Upgrade
              </Link>{' '}
              to unlock Competitor mode. Free analyses find competitors automatically.
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

function messageFor(status: number, code?: string): string {
  if (status === 403 || code === 'limit_reached') {
    return 'You have reached the free plan limit. Upgrade to keep analyzing.'
  }
  if (status === 422) return 'That URL is not valid or supported.'
  if (status === 502) return 'We could not load that page. Check the URL and try again.'
  return 'Something went wrong while analyzing. Please try again.'
}
