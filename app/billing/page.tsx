import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_PRICES, PLAN_SEATS } from '@/lib/constants'
import { SUBSCRIPTION_PLAN } from '@/lib/enums'

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Billing</h1>

      <div className="grid gap-6 sm:grid-cols-3">
        {SUBSCRIPTION_PLAN.map((plan) => (
          <Card key={plan}>
            <CardHeader>
              <CardTitle className="capitalize">{plan}</CardTitle>
              <CardDescription>
                ${PLAN_PRICES[plan]}/mo &middot; {PLAN_SEATS[plan]} seat
                {PLAN_SEATS[plan] > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={plan === 'free' ? 'outline' : 'default'}
                className="w-full"
                disabled={plan === 'free'}
              >
                {plan === 'free' ? 'Current plan' : `Upgrade to ${plan}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
