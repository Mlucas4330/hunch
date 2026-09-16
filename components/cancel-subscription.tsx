'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { BILLING_SUBSCRIBE_PATH } from '@/lib/constants'
import { formatDate } from '@/lib/i18n/format'
import { t } from '@/lib/i18n/format'

/**
 * Ending a subscription, from the account it belongs to.
 *
 * **It sends no id.** The route reads the subscription off the session, which is what makes it
 * impossible to aim at somebody else's. See app/api/billing/mercadopago/subscribe/route.ts.
 *
 * The month already paid for is kept, so the copy says when access actually ends rather than
 * implying it stops on the click.
 */
export function CancelSubscription({
  tierName,
  periodEnd
}: {
  tierName: string
  periodEnd: Date | null
}) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.settings.subscription
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [failed, setFailed] = useState(false)

  async function cancel() {
    setPending(true)
    setFailed(false)

    try {
      const response = await fetch(BILLING_SUBSCRIBE_PATH, { method: 'DELETE' })

      if (response.ok) {
        router.refresh()
        return
      }

      setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {periodEnd
          ? t(copy.activeUntil, { tier: tierName, date: formatDate(periodEnd, locale) })
          : t(copy.active, { tier: tierName })}
      </p>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="destructive" onClick={cancel} disabled={pending}>
            {pending ? copy.cancelling : copy.confirmCancel}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
            {copy.keep}
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setConfirming(true)}>
          {copy.cancel}
        </Button>
      )}

      {failed && (
        <p role="status" aria-live="polite" className="text-sm text-destructive">
          {copy.cancelFailed}
        </p>
      )}
    </div>
  )
}
