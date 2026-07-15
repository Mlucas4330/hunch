'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function WaitlistForm({ embedKey }: { embedKey: string }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

  if (status === 'done') {
    return (
      <p className="rounded-md border border-teal/40 bg-teal/10 px-4 py-3 text-sm font-medium text-teal">
        You are on the list. We will be in touch.
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
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === 'submitting'}
      />
      <Input
        type="tel"
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={status === 'submitting'}
      />
      <Button type="submit" className="w-full" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Joining...' : 'Join the waitlist'}
      </Button>
      {status === 'error' && (
        <p className="text-sm text-red">Something went wrong. Please try again.</p>
      )}
    </form>
  )
}
