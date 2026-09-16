import { redirect } from 'next/navigation'
import { BrandSettingsForm } from '@/components/brand-settings-form'
import { CancelSubscription } from '@/components/cancel-subscription'
import { LandingPricing } from '@/components/landing-pricing'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { Card, CardContent } from '@/components/ui/card'
import { brandFor } from '@/lib/brand'
import { getCurrentUser } from '@/lib/current-user'
import { PLANS_ANCHOR, SETTINGS_PATH, SIGNIN_PATH } from '@/lib/constants'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'
import { subscriptionFor } from '@/lib/subscriptions'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.settings, path: SETTINGS_PATH, index: false })
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect(SIGNIN_PATH)

  const locale = await getLocale()
  const [t, subscription] = await Promise.all([dictionaryFor(locale), subscriptionFor(user.id)])

  // **Only an authorised subscription is one to manage.** `pending` is somebody who opened a
  // checkout and never finished it, and showing it as live would tell them they had bought something
  // while hiding the button that would actually sell it. A cancellation is still honoured until its
  // period ends, but what that reader needs is the way back in, not a cancel button. Same rule as
  // `entitledTierFor`. See docs/invariants.md.
  const live =
    subscription?.tier && subscription.status === 'authorized'
      ? { tier: subscription.tier, currentPeriodEnd: subscription.currentPeriodEnd }
      : null

  return (
    // Full width, like every other signed-in screen. Capping the cards left them stranded at about
    // half the container on a wide display, which reads as a layout bug rather than as a measure,
    // and this screen was the only one that did it. The measure that matters is inside the form,
    // where the fields set their own. See docs/components.md.
    <div className="animate-fade-up space-y-8">
      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{t.settings.eyebrow}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t.settings.title}</h1>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          {/* The hint sits on the section it is about rather than on the page title, now that the
              page holds more than the brand. */}
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {t.settings.brandTitle}
            </h2>
            <InfoHint label={t.settings.hintLabel}>
              <RichText>{t.settings.hint}</RichText>
            </InfoHint>
          </div>
          <BrandSettingsForm brand={brandFor(user)} />
        </CardContent>
      </Card>

      {/* One of the two, never both: a live subscription is managed, and everything else is sold.
          **This is the only place a signed-in reader can subscribe**, because the landing page sends
          them here the moment they have an account. See docs/analysis-ui.md. */}
      {live ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {t.settings.subscription.title}
            </h2>
            <CancelSubscription
              tierName={t.landing.pricing.plans[live.tier].name}
              periodEnd={live.currentPeriodEnd}
            />
          </CardContent>
        </Card>
      ) : (
        <div id={PLANS_ANCHOR} className="scroll-mt-24">
          <LandingPricing copy={t.landing.pricing} locale={locale} />
        </div>
      )}
    </div>
  )
}
