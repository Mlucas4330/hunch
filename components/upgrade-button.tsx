'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckoutDialog } from '@/components/checkout-dialog'
import { useI18n } from '@/components/i18n-provider'
import { t } from '@/lib/i18n/format'
import type { SubscriptionPlan } from '@/lib/enums'

export function UpgradeButton({
  plan,
  isCurrent
}: {
  plan: SubscriptionPlan
  isCurrent: boolean
}) {
  const { dictionary } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={isCurrent ? 'outline' : 'default'}
        className="w-full"
        disabled={isCurrent || plan === 'free'}
        onClick={() => setOpen(true)}
      >
        {isCurrent
          ? dictionary.billing.currentPlan
          : t(dictionary.billing.upgradeTo, { plan: dictionary.labels.plan[plan] })}
      </Button>
      {open && <CheckoutDialog plan={plan} onClose={() => setOpen(false)} />}
    </>
  )
}
