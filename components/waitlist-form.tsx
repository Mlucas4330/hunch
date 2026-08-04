'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/components/i18n-provider'

export function WaitlistForm({ embedKey }: { embedKey: string }) {
  const { dictionary } = useI18n()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

  if (status === 'done') {
    return (
      <p className="rounded-md border border-teal/40 bg-teal/10 px-4 py-3 text-sm font-medium text-teal">
        {dictionary.waitlist.done}
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
        body: JSON.stringify({ email, phone: phone || undefined, embedKey })
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
        placeholder={dictionary.waitlist.emailPlaceholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === 'submitting'}
      />
      <Input
        type="tel"
        placeholder={dictionary.waitlist.phonePlaceholder}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={status === 'submitting'}
      />
      <Button type="submit" className="w-full" disabled={status === 'submitting'}>
        {status === 'submitting' ? dictionary.waitlist.joining : dictionary.waitlist.join}
      </Button>
      {status === 'error' && <p className="text-sm text-red">{dictionary.waitlist.error}</p>}
    </form>
  )
}
