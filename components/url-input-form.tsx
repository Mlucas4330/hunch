'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PHASES = ['Scraping page...', 'Analyzing copy...', 'Saving results...'] as const

export function UrlInputForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [phase, setPhase] = useState<(typeof PHASES)[number]>(PHASES[0])

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

    try {
      const res = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parsed.toString() })
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
    <form onSubmit={onSubmit} className="space-y-2">
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
      {error && (
        <p className="text-sm text-destructive" role="alert">
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
