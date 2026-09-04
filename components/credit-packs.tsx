'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { useI18n } from '@/components/i18n-provider'
import { MercadoPagoBrick } from '@/components/mercadopago-brick'
import {
  CREDIT_PACKS,
  FEATURED_CREDIT_PACK,
  FREE_ANALYSES,
  HERO_ANCHOR,
  MERCADOPAGO_PROVIDER,
  URL_FIELD_ID
} from '@/lib/constants'
import type { CreditPackId } from '@/lib/constants'
import type { PaymentProvider } from '@/lib/enums'
import { t } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

/**
 * The three cards: the free half, and the two packs with a checkout behind each.
 *
 * Prices come from the dictionary rather than from Stripe: the page has to render for a reader with
 * no session and no round trip, and the amount shown is the one the price id charges. **They have to
 * be changed together.** A price edited in Stripe and not here is a page that lies about what it
 * costs. `perAnalysis` is written out for the same reason: it is the same number divided, and
 * dividing a formatted string is not something the component can do.
 *
 * **The free card is not a pack and is deliberately not in CREDIT_PACKS.** It sells nothing, so it
 * has no amount for the Payment Brick to send, no price id, and no row in the map a webhook matches a
 * payment against -- see the note on CREDIT_PACKS. What it describes is the half this product already
 * gives away: the readout is counted by code and costs zero tokens, which is exactly why it can be
 * printed as an offer rather than as a teaser. Its features say what is measured and say plainly what
 * is not in it, because a card headed "free" that omits the limit is the wall this product removed.
 *
 * **Its button opens no checkout, it returns to the URL field.** There is nothing to pay for, so the
 * only action left is the one that starts an analysis, and it focuses the input rather than only
 * scrolling to it.
 *
 * FEATURED_CREDIT_PACK is what the marked card carries. It says which pack most buyers take, so it is
 * a fact about the offer rather than about any one reader, and nothing here reads a session.
 *
 * `provider` decides which of the two checkouts a button opens, and the server decides `provider` --
 * see app/(app)/page.tsx. Stripe leaves for its own hosted page; Mercado Pago opens the Payment Brick
 * in a dialog over the page. Neither branch knows anything about the other's credentials.
 *
 * **One dialog for both paid cards, not one each.** Only one pack can be being paid for at a time, so
 * a single instance keyed on which pack is open is the whole state -- two mounted Bricks would be two
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

  function focusUrlField() {
    const field = document.getElementById(URL_FIELD_ID)
    // The section is rendered on the landing page and nowhere else, so the field is there -- but the
    // card must still do something if that ever stops being true, and going to the hero by URL works
    // from any route.
    if (!(field instanceof HTMLInputElement)) {
      window.location.href = HERO_ANCHOR
      return
    }

    field.scrollIntoView({ behavior: 'smooth', block: 'center' })
    field.focus({ preventScroll: true })
  }

  const opened = CREDIT_PACKS.find((pack) => pack.id === open)
  const free = copy.packs.free

  return (
    <div
      // `items-stretch` rather than `items-start`, and no lift on the marked card: three cards of
      // three different heights read as three different offers, and the mark is already carried by
      // the ring and the filled button.
      className="grid items-stretch gap-4 pt-3 sm:grid-cols-2 md:grid-cols-3"
      data-testid="credit-packs"
    >
      {opened && (
        <Dialog open onClose={() => setOpen(null)} title={copy.packs[opened.id].name}>
          <MercadoPagoBrick pack={opened.id} amount={opened.amountBrl} />
        </Dialog>
      )}

      <Card className="relative flex flex-col border-dashed">
        <CardContent className="flex flex-1 flex-col gap-4 p-5">
          <PackHeading label={free} />

          <p className="text-sm">{free.tagline}</p>

          <div className="h-px bg-border" />

          <ul className="space-y-2">
            <li className="flex gap-2 text-sm font-medium">
              <Check className="mt-0.5 size-3.5 shrink-0 text-foreground" aria-hidden />
              {t(copy.credits, { count: FREE_ANALYSES })}
            </li>
            <PackFeatures features={free.features} />
          </ul>

          <Button variant="outline" className="mt-auto" onClick={focusUrlField}>
            {copy.freeCta}
          </Button>
        </CardContent>
      </Card>

      {CREDIT_PACKS.map((pack) => {
        const label = copy.packs[pack.id]
        const featured = pack.id === FEATURED_CREDIT_PACK

        return (
          <Card
            key={pack.id}
            className={cn(
              'relative flex flex-col',
              featured && 'border-purple ring-1 ring-purple'
            )}
          >
            {featured && (
              <span className="panel-label absolute -top-2.5 left-5 rounded-sm bg-purple px-2 py-0.5 text-nano text-primary-foreground">
                {copy.mostChosen}
              </span>
            )}

            <CardContent className="flex flex-1 flex-col gap-4 p-5">
              <PackHeading label={label} />

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
                <PackFeatures features={label.features} featured={featured} />
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

function PackHeading({
  label
}: {
  label: { name: string; price: string; perAnalysis: string }
}) {
  return (
    <div className="space-y-1">
      <p className="panel-label text-micro text-muted-foreground">{label.name}</p>
      <p className="font-display text-3xl font-bold tracking-tight">{label.price}</p>
      <p className="font-mono text-xs text-muted-foreground">{label.perAnalysis}</p>
    </div>
  )
}

function PackFeatures({
  features,
  featured = false
}: {
  features: readonly string[]
  featured?: boolean
}) {
  return (
    <>
      {features.map((feature) => (
        <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
          <Check
            className={cn('mt-0.5 size-3.5 shrink-0', featured ? 'text-purple' : 'text-muted-foreground')}
            aria-hidden
          />
          {feature}
        </li>
      ))}
    </>
  )
}
