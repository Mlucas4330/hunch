import Link from 'next/link'
import { auth } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { PLAN_PRICES, PLAN_SEATS, FREE_ANALYSES_LIMIT } from '@/lib/constants'
import { SUBSCRIPTION_PLAN, type Section, type SubscriptionPlan } from '@/lib/enums'
import { cn } from '@/lib/utils'

type SampleHunch = {
  section: Section
  problem: string
  impact: number
  effort: number
  variant?: string
  evidence?: string
}

const SAMPLE_READOUT: SampleHunch[] = [
  {
    section: 'headline',
    problem: 'Your H1 says what you do, not why it beats the tab they already have open.',
    impact: 9,
    effort: 2,
    variant: 'Ship changes to your pricing page without waiting on a designer.',
    evidence: 'Linear leads with the outcome the founder wants, not the feature set.'
  },
  {
    section: 'cta',
    problem: '"Sign up" asks for commitment before the visitor has seen a single win.',
    impact: 7,
    effort: 1
  },
  {
    section: 'social_proof',
    problem: 'Nothing above the fold tells them another founder trusted this.',
    impact: 6,
    effort: 3
  }
]

type Pain = {
  channel: string
  headline: string
  reality: string
  answer: string
}

const PAINS: Pain[] = [
  {
    channel: 'border-coral',
    headline: 'Your traffic is too low to test everything.',
    reality:
      'A few hundred visitors a week buys you maybe one experiment a month. Pick the wrong one and you learn nothing.',
    answer: 'Every hunch is ranked by predicted impact, so your one shot lands where it moves revenue.'
  },
  {
    channel: 'border-purple',
    headline: "There is no growth team. It's you, at 11pm.",
    reality:
      'No CRO, no copywriter, no backlog of experiments. Just you and a page you have read a thousand times.',
    answer: 'Paste the URL once. Get five to eight tests written for you, variant copy included.'
  },
  {
    channel: 'border-teal',
    headline: 'You never know where to start.',
    reality:
      'You know conversion matters. Every guide says "just test." None of them say what to test first.',
    answer: 'Hunch turns the blank page into an ordered path: headline, then CTA, then proof.'
  }
]

const STEPS = [
  {
    label: 'Paste your URL',
    body: 'Drop in your live landing page. Hunch scrapes the copy and studies two to three real competitors in your space.'
  },
  {
    label: 'Get ranked hunches',
    body: 'Five to eight A/B tests, ordered by impact, each with variant copy and the competitor pattern it borrows.'
  },
  {
    label: 'Launch in one line',
    body: 'Pick a variant and drop one script tag on your page. Hunch shows it to half your visitors, no redeploy or code changes.'
  },
  {
    label: 'Read the verdict',
    body: 'A timed 7, 14, or 30-day test measures real conversions and returns a proven winner with a plain recommendation.'
  }
] as const

const PROOF: { title: string; body: string }[] = [
  {
    title: 'One line to go live',
    body: 'Drop in a single script tag. Hunch splits your traffic and swaps the copy client-side. Nothing to redeploy.'
  },
  {
    title: 'Timed, honest tests',
    body: 'Choose 7, 14, or 30 days. Significance is read once at the finish line, so you never chase a false winner.'
  },
  {
    title: 'A verdict you can ship',
    body: 'Each test auto-closes into a report: conversion lift, statistical significance, and a plain recommendation.'
  }
]

const PLAN_PITCH: Record<SubscriptionPlan, { line: string; features: string[] }> = {
  free: {
    line: 'Kick the tires on your own page.',
    features: [
      `${FREE_ANALYSES_LIMIT} analyses / month`,
      '1 live experiment',
      'Your last 3 analyses',
      'Single seat'
    ]
  },
  solo: {
    line: 'For the founder who ships every week.',
    features: [
      'Unlimited analyses',
      'Unlimited live experiments',
      'Full history',
      'Competitor mode',
      'Export & test reports'
    ]
  },
  team: {
    line: 'For the small team splitting the growth work.',
    features: ['Everything in Solo', '3 seats', 'Shared history', 'Export & test reports']
  }
}

export default async function LandingPage() {
  const session = await auth()
  const ctaHref = session?.user ? '/dashboard' : '/auth/signin'

  return (
    <div className="animate-fade-up space-y-24 pb-12">
      <section className="grid items-center gap-10 pt-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <p className="panel-label text-[0.7rem] text-muted-foreground">
            Conversion instrument for micro-SaaS
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            Find it. Test it.
            <span className="block text-muted-foreground">Prove what converts.</span>
          </h1>
          <p className="max-w-md text-base text-muted-foreground">
            Hunch reads your landing page, studies real competitors, and hands you a ranked backlog
            of A/B tests, then runs the ones you pick live and proves which copy actually lifts
            conversion.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Button asChild size="lg">
              <Link href={ctaHref}>Analyze your landing page</Link>
            </Button>
            <Link
              href="#how"
              className="panel-label text-[0.7rem] text-muted-foreground transition-colors hover:text-foreground"
            >
              How it works
            </Link>
          </div>
        </div>

        <HeroReadout />
      </section>

      <section className="space-y-10">
        <header className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">The reality</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            The problem was never effort. It was knowing where to point it.
          </h2>
        </header>
        <div className="space-y-4">
          {PAINS.map((pain) => (
            <Card key={pain.headline} className={cn('border-l-2', pain.channel)}>
              <CardContent className="grid gap-4 p-5 md:grid-cols-[1.1fr_1fr] md:items-center">
                <div className="space-y-1.5">
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    {pain.headline}
                  </h3>
                  <p className="text-sm text-muted-foreground">{pain.reality}</p>
                </div>
                <p className="border-t pt-3 text-sm md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  {pain.answer}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="how" className="space-y-10 scroll-mt-20">
        <header className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">How it works</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            One paste to a proven winner.
          </h2>
        </header>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.label} className="space-y-3">
              <span className="panel-label text-sm text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="h-px bg-border" />
              <h3 className="font-display text-lg font-semibold tracking-tight">{step.label}</h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-10">
        <header className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">Proof, not opinions</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Every hunch ends in a number.
          </h2>
        </header>
        <div className="grid gap-6 sm:grid-cols-3">
          {PROOF.map((item) => (
            <Card key={item.title}>
              <CardContent className="space-y-2 p-5">
                <h3 className="font-display text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <header className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">Pricing</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Start free. Upgrade when testing becomes a habit.
          </h2>
        </header>
        <div className="grid gap-6 sm:grid-cols-3">
          {SUBSCRIPTION_PLAN.map((plan) => {
            const featured = plan === 'solo'
            return (
              <Card
                key={plan}
                className={cn('flex flex-col', featured && 'border-purple ring-1 ring-purple')}
              >
                <CardContent className="flex flex-1 flex-col gap-4 p-5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-semibold capitalize tracking-tight">
                        {plan}
                      </span>
                      {featured && (
                        <span className="panel-label text-[0.6rem] text-purple">Most popular</span>
                      )}
                    </div>
                    <p className="font-mono text-2xl font-semibold tabular-nums">
                      ${PLAN_PRICES[plan]}
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{PLAN_PITCH[plan].line}</p>
                  </div>
                  <ul className="flex-1 space-y-2 text-sm">
                    {PLAN_PITCH[plan].features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={featured ? 'default' : 'outline'} className="w-full">
                    <Link href={ctaHref}>
                      {plan === 'free' ? 'Start free' : `Choose ${plan}`}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <p className="panel-label text-[0.65rem] text-muted-foreground">
          {PLAN_SEATS.team} seats on Team, cancel anytime
        </p>
      </section>

      <section>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
            <h2 className="max-w-lg font-display text-2xl font-bold tracking-tight">
              Stop rereading your own copy. Start with a hunch.
            </h2>
            <Button asChild size="lg">
              <Link href={ctaHref}>Analyze your landing page</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function HeroReadout() {
  return (
    <Card className="animate-pop-in shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">yoursaas.com</span>
        <span className="flex items-center gap-1.5 panel-label text-[0.6rem] text-green">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-green" />
          Live test
        </span>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between rounded-md border border-green bg-green/10 p-3">
          <div>
            <p className="text-sm font-medium">Headline variant wins</p>
            <p className="text-xs text-muted-foreground">14-day test, 2,140 visitors</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold text-green">+18%</p>
            <p className="panel-label text-[0.6rem] text-green">Significant</p>
          </div>
        </div>
        {SAMPLE_READOUT.map((hunch) => (
          <div key={hunch.section} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionBadge section={hunch.section} />
              <div className="flex items-center gap-3">
                <ScoreIndicator label="Impact" score={hunch.impact} kind="impact" />
                <ScoreIndicator label="Effort" score={hunch.effort} kind="effort" />
              </div>
            </div>
            <p className="mt-2 text-sm">{hunch.problem}</p>
            {hunch.variant && (
              <div className="mt-3 space-y-1 rounded-sm bg-muted p-2.5">
                <p className="text-sm font-medium">{`"${hunch.variant}"`}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="panel-label text-[0.6rem] text-teal">Why</span> {hunch.evidence}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
