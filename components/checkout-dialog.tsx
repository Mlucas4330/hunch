'use client'

import { useCallback, useEffect } from 'react'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-client'
import { useI18n } from '@/components/i18n-provider'
import { t } from '@/lib/i18n/format'
import type { SubscriptionPlan } from '@/lib/enums'

export function CheckoutDialog({
  plan,
  onClose
}: {
  plan: SubscriptionPlan
  onClose: () => void
}) {
  const { dictionary } = useI18n()
  const upgradeLabel = t(dictionary.billing.upgradeTo, { plan: dictionary.labels.plan[plan] })

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
      aria-label={upgradeLabel}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-xl flex-col rounded-lg border bg-card p-4 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <span className="panel-label text-[0.7rem] text-muted-foreground">{upgradeLabel}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={dictionary.billing.closeCheckoutAria}
            className="rounded-sm px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            {dictionary.common.close}
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
