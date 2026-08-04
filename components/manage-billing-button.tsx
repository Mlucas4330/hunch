'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'

export function ManageBillingButton() {
  const { dictionary } = useI18n()
  const [pending, setPending] = useState(false)

  async function onClick() {
    setPending(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setPending(false)
    }
  }

  return (
    <Button variant="outline" disabled={pending} onClick={onClick}>
      {dictionary.billing.manageBilling}
    </Button>
  )
}
