'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { BILLING_SUBSCRIBE_PATH, CALLBACK_URL_PARAM, SIGNIN_PATH } from '@/lib/constants'
import type { PlanTier } from '@/lib/enums'

/**
 * One tier's checkout.
 *
 * **It sends the tier and never a price.** The route reads the amount from `PLAN`, and the webhook
 * matches the confirmed amount back against the same map, so a caller editing this request can only
 * ever buy the tier they named. See docs/security.md.
 *
 * **Who is signed in is the route's answer, not this component's guess.** The landing renders only
 * for a signed-out reader today, and a button that decided that for itself would be wrong the first
 * time the price list is mounted anywhere else. A 401 sends the reader to sign in and back.
 */
export function SubscribeButton({ tier }: { tier: PlanTier }) {
  const { dictionary } = useI18n()
  const copy = dictionary.landing.pricing
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function subscribe() {
    setPending(true)
    setFailed(false)

    try {
      const response = await fetch(BILLING_SUBSCRIBE_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      })

      if (response.status === 401) {
        router.push(
          `${SIGNIN_PATH}?${CALLBACK_URL_PARAM}=${encodeURIComponent(window.location.pathname)}`
        )
        return
      }

      const body = (await response.json().catch(() => null)) as { initPoint?: string | null } | null

      // The provider's own page is where the card is entered, so this is a full navigation rather
      // than anything embedded: no SDK, and no holes in the CSP.
      if (response.ok && body?.initPoint) {
        window.location.href = body.initPoint
        return
      }

      setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-1 sm:text-right">
      <Button onClick={subscribe} disabled={pending} variant="outline">
        {pending ? copy.subscribing : copy.subscribe}
      </Button>
      {failed && (
        <p role="status" aria-live="polite" className="text-sm text-destructive">
          {copy.subscribeFailed}
        </p>
      )}
    </div>
  )
}
