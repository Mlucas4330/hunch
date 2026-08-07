'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/components/i18n-provider'
import { DEFAULT_LEAD_SOURCE } from '@/lib/constants'
import type { LeadSource } from '@/lib/enums'

// The six strings the form needs. `landing.contact.form` mirrors `waitlist` key for key so one
// component serves both callers -- the report's wall and the landing page's contact section are the
// same three inputs and the same endpoint, differing only in `source` and in what they say.
type FormCopy = {
  done: string
  emailPlaceholder: string
  phonePlaceholder: string
  join: string
  joining: string
  error: string
}

export function WaitlistForm({
  embedKey,
  source = DEFAULT_LEAD_SOURCE,
  copy
}: {
  embedKey?: string
  source?: LeadSource
  copy?: FormCopy
}) {
  const { dictionary } = useI18n()
  const text = copy ?? dictionary.waitlist
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

  if (status === 'done') {
    return (
      <p className="rounded-md border border-teal/40 bg-teal/10 px-4 py-3 text-sm font-medium text-teal">
        {text.done}
      </p>
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phone || undefined, embedKey, source })
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        type="email"
        required
        placeholder={text.emailPlaceholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === 'submitting'}
      />
      <Input
        type="tel"
        placeholder={text.phonePlaceholder}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={status === 'submitting'}
      />
      <Button type="submit" className="w-full" disabled={status === 'submitting'}>
        {status === 'submitting' ? text.joining : text.join}
      </Button>
      {status === 'error' && <p className="text-sm text-red">{text.error}</p>}
    </form>
  )
}
