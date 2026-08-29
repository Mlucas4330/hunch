'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { useI18n } from '@/components/i18n-provider'
import { MercadoPagoBrick } from '@/components/mercadopago-brick'
import { CREDIT_PACKS, FEATURED_CREDIT_PACK, MERCADOPAGO_PROVIDER } from '@/lib/constants'
import type { CreditPackId } from '@/lib/constants'
import type { PaymentProvider } from '@/lib/enums'
import { t } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

/**
 * The two packs, and the checkout button behind each.
 *
 * Prices come from the dictionary rather than from Stripe: the page has to render for a reader with
 * no session and no round trip, and the amount shown is the one the price id charges. **They have to
 * be changed together** — a price edited in Stripe and not here is a page that lies about what it
 * costs. `perAnalysis` is written out for the same reason: it is the same number divided, and
 * dividing a formatted string is not something the component can do.
 *
 * FEATURED_CREDIT_PACK is what the middle card marks. It says which pack most buyers take, so it is
 * a fact about the offer rather than about any one reader, and nothing here reads a session.
 *
 * `provider` decides which of the two checkouts a button opens, and the server decides `provider` --
 * see app/(app)/page.tsx. Stripe leaves for its own hosted page; Mercado Pago opens the Payment Brick
 * in a dialog over the page. Neither branch knows anything about the other's credentials.
 *
 * **One dialog for both cards, not one each.** Only one pack can be being paid for at a time, so a
 * single instance keyed on which pack is open is the whole state -- two mounted Bricks would be two
 * SDK initialisations racing for the same container id.
 */
export function CreditPacks({
  signedIn,
  provider
}: {
  signedIn: boolean
  provider: PaymentProvider
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.credits
  const [pending, setPending] = useState<string | null>(null)
  const [open, setOpen] = useState<CreditPackId | null>(null)

  function signIn() {
    window.location.href = `/auth/signin?${new URLSearchParams({ callbackUrl: '/dashboard' })}`
  }

  async function buy(pack: string) {
    if (!signedIn) {
      signIn()
      return
    }

    setPending(pack)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack })
      })
      const { url }: { url?: string } = await res.json()
      if (url) window.location.href = url
      else setPending(null)
    } catch {
      setPending(null)
    }
  }

  const opened = CREDIT_PACKS.find((pack) => pack.id === open)

  return (
    <div className="grid items-start gap-4 pt-3 sm:grid-cols-2" data-testid="credit-packs">
      {opened && (
        <Dialog open onClose={() => setOpen(null)} title={copy.packs[opened.id].name}>
          <MercadoPagoBrick pack={opened.id} amount={opened.amountBrl} />
        </Dialog>
      )}

      {CREDIT_PACKS.map((pack) => {
        const label = copy.packs[pack.id]
        const featured = pack.id === FEATURED_CREDIT_PACK

        return (
          <Card
            key={pack.id}
            className={cn(
              'relative flex flex-col',
              featured && 'border-purple ring-1 ring-purple sm:-mt-3'
            )}
          >
            {featured && (
              <span className="panel-label absolute -top-2.5 left-5 rounded-sm bg-purple px-2 py-0.5 text-[0.6rem] text-primary-foreground">
                {copy.mostChosen}
              </span>
            )}

            <CardContent className="flex flex-1 flex-col gap-4 p-5">
              <div className="space-y-1">
                <p className="panel-label text-[0.65rem] text-muted-foreground">{label.name}</p>
                <p className="font-display text-3xl font-bold tracking-tight">{label.price}</p>
                <p className="font-mono text-xs text-muted-foreground">{label.perAnalysis}</p>
              </div>

              <p className="text-sm">{label.tagline}</p>

              <div className="h-px bg-border" />

              <ul className="space-y-2">
                <li className="flex gap-2 text-sm font-medium">
                  <Check
                    className={cn('mt-0.5 size-3.5 shrink-0', featured ? 'text-purple' : 'text-foreground')}
                    aria-hidden
                  />
                  {t(copy.credits, { count: pack.credits })}
                </li>
                {label.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
                    <Check
                      className={cn('mt-0.5 size-3.5 shrink-0', featured ? 'text-purple' : 'text-muted-foreground')}
                      aria-hidden
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-auto"
                variant={featured ? 'default' : 'outline'}
                disabled={pending !== null}
                onClick={() => {
                  if (!signedIn) signIn()
                  else if (provider === MERCADOPAGO_PROVIDER) setOpen(pack.id)
                  else buy(pack.id)
                }}
              >
                {pending === pack.id ? copy.opening : copy.buy}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
