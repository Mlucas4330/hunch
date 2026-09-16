'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { SignInToSubscribe, SubscribeButton } from '@/components/subscribe-button'
import { SubscribeCard } from '@/components/subscribe-card'
import { CALLBACK_URL_PARAM, SIGNIN_PATH } from '@/lib/constants'
import type { PlanTier } from '@/lib/enums'
import { PLAN } from '@/lib/constants'
import { PLAN_TIER, RECOMMENDED_PLAN_TIER, type Locale } from '@/lib/enums'
import { formatNumber, t } from '@/lib/i18n/format'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import { cn } from '@/lib/utils'

/**
 * The price list, as one panel of rows. Not three cards: the three-column grid is already the
 * how-it-works section and the tile grid is already the report section. The row a reader is meant to
 * land on is the tinted one, and the section carries no button of its own, because the page's
 * actions sit in the hero and in the closing card. See docs/analysis-ui.md.
 *
 * A tier's features are copy and nothing branches on them: every account sees the same product, and
 * the one line that is not shipped yet says so.
 *
 * **A client component because the card form opens in place.** Only one may be open at a time, so
 * which tier that is lives here rather than in each row.
 */
export function LandingPricing({
  copy,
  locale,
  signedIn = false,
  payerEmail = ''
}: {
  copy: Dictionary['landing']['pricing']
  locale: Locale
  /** A card cannot be taken without a session, so a signed-out reader is sent to sign in first. */
  signedIn?: boolean
  /** The signed-in reader's address, to save them typing it into the card form. */
  payerEmail?: string
}) {
  const [openTier, setOpenTier] = useState<PlanTier | null>(null)

  return (
    <section className="space-y-6">
      <h2 className="text-balance font-display text-2xl font-bold tracking-tight">{copy.heading}</h2>

      <div className="divide-y rounded-lg border">
        {PLAN_TIER.map((tier) => {
          const recommended = tier === RECOMMENDED_PLAN_TIER

          const open = openTier === tier

          return (
            <div key={tier} className={cn('p-6', recommended && 'animate-shine bg-purple/10')}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    {copy.plans[tier].name}
                  </h3>
                  {recommended && (
                    <span className="panel-label rounded-full border border-purple-soft px-2 py-0.5 text-micro text-muted-foreground">
                      {copy.recommended}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{copy.plans[tier].body}</p>
                <ul className="space-y-1 pt-1.5">
                  {copy.plans[tier].features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="shrink-0 space-y-3 sm:text-right">
                <div className="space-y-1">
                  <p className="font-display text-2xl font-bold tracking-tight">
                    {t(copy.price, { value: formatNumber(PLAN[tier].priceBrl, locale) })}
                  </p>
                  <p className="panel-label text-micro text-muted-foreground">
                    {t(copy.quota, { count: formatNumber(PLAN[tier].quota, locale) })}
                  </p>
                </div>
                {signedIn ? (
                  !open && <SubscribeButton onOpen={() => setOpenTier(tier)} />
                ) : (
                  <SignInToSubscribe
                    href={`${SIGNIN_PATH}?${CALLBACK_URL_PARAM}=${encodeURIComponent('/settings')}`}
                  />
                )}
              </div>
              </div>

              {/* Full width, under the row rather than in the price column: a card form does not fit
                  beside a price, and shrinking it is how a checkout starts feeling unsafe. */}
              {open && (
                <div className="mt-6 border-t pt-6">
                  <SubscribeCard
                    tier={tier}
                    amount={PLAN[tier].priceBrl}
                    payerEmail={payerEmail}
                    onCancel={() => setOpenTier(null)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="max-w-xl text-sm text-muted-foreground">{copy.note}</p>
    </section>
  )
}
