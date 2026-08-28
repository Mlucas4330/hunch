'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'

/**
 * Ends the subscription, from the place it was bought.
 *
 * **It sends no id.** The route resolves the subscription from the session, so there is no field
 * here a caller could put somebody else's authorisation in -- see the DELETE handler.
 *
 * `router.refresh()` rather than local optimistic state: the card above this is server-rendered from
 * the row, and the row is what the webhook will also be writing. Two places deciding what state this
 * is in is exactly what the optimistic version would create.
 */
export function CancelSubscription() {
  const router = useRouter()
  const { dictionary } = useI18n()
  const copy = dictionary.dashboard.subscription
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  async function cancel() {
    setState('loading')

    try {
      const res = await fetch('/api/billing/mercadopago/subscribe', { method: 'DELETE' })
      if (!res.ok) {
        setState('error')
        return
      }
      router.refresh()
    } catch {
      setState('error')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="cancel-subscription">
      <Button
        variant="outline"
        size="sm"
        onClick={cancel}
        disabled={state === 'loading'}
        aria-busy={state === 'loading'}
      >
        {state === 'loading' ? copy.cancelling : copy.cancel}
      </Button>
      <p className="text-xs text-muted-foreground">
        {state === 'error' ? copy.cancelError : copy.cancelNote}
      </p>
    </div>
  )
}
