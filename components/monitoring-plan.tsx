'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/components/i18n-provider'

/**
 * The monitoring subscription, offered under the credit packs.
 *
 * **It sits in its own block rather than as a fourth card in that grid, and the reason is not
 * layout.** A pack and this sell different things -- a pack buys generation, which costs tokens and
 * happens once; this buys the page being measured every week, which costs a browser slot and no
 * tokens at all. Priced side by side in one row a reader compares R$97 against R$99 and concludes
 * the ten-pack is better value, which misreads both. See docs/product.md.
 *
 * **No Payment Brick here.** A preapproval is confirmed at a hosted `init_point`, so this is a POST
 * and a redirect -- simpler than the pack flow, not a stripped-down version of it. The Brick belongs
 * to the one-off payment and has nothing to collect for this.
 */
export function MonitoringPlan({ signedIn }: { signedIn: boolean }) {
  const { dictionary } = useI18n()
  const copy = dictionary.credits.monitoring
  const [pending, setPending] = useState(false)

  async function subscribe() {
    if (!signedIn) {
      window.location.href = `/auth/signin?${new URLSearchParams({ callbackUrl: '/dashboard' })}`
      return
    }

    setPending(true)
    try {
      const res = await fetch('/api/billing/mercadopago/subscribe', { method: 'POST' })
      const { initPoint }: { initPoint?: string | null } = await res.json()

      if (initPoint) window.location.href = initPoint
      else setPending(false)
    } catch {
      setPending(false)
    }
  }

  return (
    <Card className="mt-4" data-testid="monitoring-plan">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex-1 space-y-2">
          <p className="panel-label text-[0.65rem] text-muted-foreground">{copy.eyebrow}</p>
          <h3 className="font-display text-xl font-bold tracking-tight">{copy.tagline}</h3>
          <p className="text-sm text-muted-foreground">{copy.body}</p>

          <ul className="space-y-2 pt-2">
            {copy.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-purple" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:w-48 sm:items-end sm:text-right">
          <div className="space-y-1">
            <p className="panel-label text-[0.65rem] text-muted-foreground">{copy.name}</p>
            <p className="font-display text-3xl font-bold tracking-tight">{copy.price}</p>
            <p className="font-mono text-xs text-muted-foreground">{copy.cadence}</p>
          </div>

          <Button className="w-full sm:w-auto" disabled={pending} onClick={subscribe}>
            {pending ? copy.opening : copy.cta}
          </Button>

          <p className="text-xs text-muted-foreground">{copy.note}</p>
        </div>
      </CardContent>
    </Card>
  )
}
