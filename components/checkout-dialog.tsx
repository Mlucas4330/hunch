'use client'

import { useCallback, useEffect } from 'react'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-client'
import type { SubscriptionPlan } from '@/lib/enums'

export function CheckoutDialog({
  plan,
  onClose
}: {
  plan: SubscriptionPlan
  onClose: () => void
}) {
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.client_secret) {
      throw new Error('checkout_unavailable')
    }
    return body.client_secret as string
  }, [plan])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Upgrade to ${plan}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-xl flex-col rounded-lg border bg-card p-4 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <span className="panel-label text-[0.7rem] text-muted-foreground capitalize">
            Upgrade to {plan}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="rounded-sm px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            Close
          </button>
        </div>
        <div className="-mr-2 flex-1 overflow-y-auto pr-2">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  )
}
