'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/components/i18n-provider'

/**
 * Offers to send the reader the link to the report they are looking at.
 *
 * **It gates nothing and must never start to.** The readout above it is the part a reader can check
 * against their own site in one click, and putting a measurement of someone's own page behind an
 * address reads as a trick -- see docs/invariants.md. This sits below the numbers, asks once, and
 * takes no for an answer.
 *
 * The offer is real rather than a pretext for collecting the address: an `embed_key` is an
 * unguessable uuid held only in this browser's localStorage, so clearing history genuinely loses the
 * report. The email is the only durable copy of that link an anonymous reader can have.
 */
export function WatchPageForm({ embedKey }: { embedKey: string }) {
  const { dictionary } = useI18n()
  const copy = dictionary.watch

  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (state === 'sending') return

    setState('sending')
    setError(null)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, embedKey })
      })

      if (response.ok) {
        setState('sent')
        return
      }

      setState('idle')
      setError(
        response.status === 422
          ? copy.errorInvalid
          : response.status === 429
            ? copy.errorRate
            : copy.errorGeneric
      )
    } catch {
      setState('idle')
      setError(copy.errorGeneric)
    }
  }

  if (state === 'sent') {
    return (
      <Card data-testid="watch-page-form">
        <CardContent className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
          <Mail aria-hidden className="h-4 w-4" />
          {copy.success}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="watch-page-form">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold tracking-tight">{copy.heading}</h2>
          <p className="text-pretty text-sm text-muted-foreground">{copy.body}</p>
        </div>

        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.placeholder}
            aria-label={copy.heading}
            aria-invalid={error !== null}
            disabled={state === 'sending'}
          />
          <Button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? copy.sending : copy.cta}
          </Button>
        </form>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{copy.note}</p>
        )}
      </CardContent>
    </Card>
  )
}
