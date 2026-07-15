import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_PRICES, PLAN_SEATS, FREE_ANALYSES_LIMIT } from '@/lib/constants'
import { SUBSCRIPTION_PLAN } from '@/lib/enums'
import { getCurrentUser } from '@/lib/current-user'
import { UpgradeButton } from '@/components/upgrade-button'
import { ManageBillingButton } from '@/components/manage-billing-button'

export default async function BillingPage() {
  const user = await getCurrentUser()

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">Billing</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Plans &amp; usage</h1>
      </div>

      {user?.plan === 'free' && (
        <Card data-testid="usage-counter">
          <CardContent className="p-4 text-sm">
            <span className="font-mono font-semibold tabular-nums">{user.analysesCount}</span> of{' '}
            <span className="font-mono font-semibold tabular-nums">{FREE_ANALYSES_LIMIT}</span>{' '}
            analyses used this month
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-3">
        {SUBSCRIPTION_PLAN.map((plan) => {
          const isCurrent = user?.plan === plan
          return (
            <Card key={plan}>
              <CardHeader>
                <CardTitle className="font-display capitalize tracking-tight">{plan}</CardTitle>
                <CardDescription className="font-mono tabular-nums">
                  ${PLAN_PRICES[plan]}/mo &middot; {PLAN_SEATS[plan]} seat
                  {PLAN_SEATS[plan] > 1 ? 's' : ''}
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
