'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckoutDialog } from '@/components/checkout-dialog'
import type { SubscriptionPlan } from '@/lib/enums'

export function UpgradeButton({
  plan,
  isCurrent
}: {
  plan: SubscriptionPlan
  isCurrent: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={isCurrent ? 'outline' : 'default'}
        className="w-full"
        disabled={isCurrent || plan === 'free'}
        onClick={() => setOpen(true)}
      >
        {isCurrent ? 'Current plan' : `Upgrade to ${plan}`}
      </Button>
      {open && <CheckoutDialog plan={plan} onClose={() => setOpen(false)} />}
    </>
  )
}
