import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAN_PRICES, PLAN_SEATS } from '@/lib/constants'
import { SUBSCRIPTION_PLAN } from '@/lib/enums'

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="space-y-6 py-12 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Stop guessing what to A/B test
        </h1>
        <p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground">
          Paste your SaaS landing page URL. Get a prioritized list of A/B test hypotheses, each with
          a rationale, predicted impact, and suggested variant copy.
        </p>
        <Button asChild size="lg">
          <Link href="/dashboard">Analyze your landing page</Link>
        </Button>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
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
              <Button asChild variant={plan === 'solo' ? 'default' : 'outline'} className="w-full">
                <Link href="/billing">Choose {plan}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
