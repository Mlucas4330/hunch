import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_PRICES, FREE_ANALYSES_LIMIT } from '@/lib/constants'
import { SUBSCRIPTION_PLAN } from '@/lib/enums'
import { getCurrentUser } from '@/lib/current-user'
import { usageFor } from '@/lib/usage'
import { UpgradeButton } from '@/components/upgrade-button'
import { ManageBillingButton } from '@/components/manage-billing-button'
import { getDictionary } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.billing, path: '/billing', index: false })
}

export default async function BillingPage() {
  const user = await getCurrentUser()
  const t = await getDictionary()

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{t.billing.eyebrow}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t.billing.title}</h1>
      </div>

      {user?.plan === 'free' && (
        <Card data-testid="usage-counter">
          <CardContent className="p-4 text-sm">
            <span className="font-mono font-semibold tabular-nums">
              {usageFor(user).analyses_count}
            </span>{' '}
            {t.billing.usageOf}{' '}
            <span className="font-mono font-semibold tabular-nums">{FREE_ANALYSES_LIMIT}</span>{' '}
            {t.billing.usageCounter}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {SUBSCRIPTION_PLAN.map((plan) => {
          const isCurrent = user?.plan === plan
          return (
            <Card key={plan}>
              <CardHeader>
                <CardTitle className="font-display tracking-tight">
                  {t.labels.plan[plan]}
                </CardTitle>
                <CardDescription className="font-mono tabular-nums">
                  ${PLAN_PRICES[plan]}
                  {t.billing.perMonth}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UpgradeButton plan={plan} isCurrent={isCurrent} />
              </CardContent>
            </Card>
          )
        })}
      </div>

      {user && user.plan !== 'free' && (
        <div>
          <ManageBillingButton />
        </div>
      )}
    </div>
  )
}
