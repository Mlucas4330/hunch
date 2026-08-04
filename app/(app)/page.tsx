import Link from 'next/link'
import { auth } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { PLAN_PRICES, FREE_ANALYSES_LIMIT } from '@/lib/constants'
import { SUBSCRIPTION_PLAN, type Locale, type Section } from '@/lib/enums'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'
import { formatNumber, t } from '@/lib/i18n/format'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import { cn } from '@/lib/utils'

// The readout is a static illustration of a finished analysis, so its shape lives here while the
// copy for each row comes from the dictionary.
const SAMPLE_SECTIONS: Section[] = ['headline', 'cta', 'social_proof']
const SAMPLE_SCORES = [
  { impact: 9, effort: 2 },
  { impact: 7, effort: 1 },
  { impact: 6, effort: 3 }
]
const SAMPLE_VISITORS = 2140

const PAIN_CHANNELS = ['border-coral', 'border-purple', 'border-teal']

// The only indexable route in the app.
export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.landing, path: '/', index: true })
}

export default async function LandingPage() {
  const session = await auth()
  const locale = await getLocale()
  const d = dictionaryFor(locale)
  const ctaHref = session?.user ? '/dashboard' : '/auth/signin'

  return (
    <div className="animate-fade-up space-y-24 pb-12">
      <section className="grid items-center gap-10 pt-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <p className="panel-label text-[0.7rem] text-muted-foreground">{d.landing.eyebrow}</p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            {d.landing.headlineTop}
            <span className="block text-muted-foreground">{d.landing.headlineBottom}</span>
          </h1>
          <p className="max-w-md text-base text-muted-foreground">{d.landing.lead}</p>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Button asChild size="lg">
              <Link href={ctaHref}>{d.landing.cta}</Link>
            </Button>
            <Link
              href="#how"
              className="panel-label text-[0.7rem] text-muted-foreground transition-colors hover:text-foreground"
            >
              {d.landing.howItWorksLink}
            </Link>
          </div>
        </div>

        <HeroReadout dictionary={d} locale={locale} />
      </section>

      <section className="space-y-10">
        <header className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">
            {d.landing.reality.eyebrow}
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {d.landing.reality.heading}
          </h2>
        </header>
        <div className="space-y-4">
          {d.landing.pains.map((pain, i) => (
            <Card key={pain.headline} className={cn('border-l-2', PAIN_CHANNELS[i])}>
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
          <p className="panel-label text-[0.7rem] text-muted-foreground">{d.landing.how.eyebrow}</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">{d.landing.how.heading}</h2>
          <p className="max-w-2xl pt-1 text-sm text-muted-foreground">{d.landing.how.intro}</p>
        </header>
        <div className="grid gap-10 lg:grid-cols-2">
          {d.landing.tracks.map((track) => (
            <div key={track.label} className="space-y-6">
              <div className="flex items-baseline gap-3">
                <h3 className="font-display text-xl font-bold tracking-tight">{track.label}</h3>
                <span className="panel-label text-[0.6rem] text-muted-foreground">{track.note}</span>
              </div>
              <ol className="grid gap-6 sm:grid-cols-3">
                {track.steps.map((step, i) => (
                  <li key={step.label} className="space-y-3">
                    <span className="panel-label text-sm text-muted-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="h-px bg-border" />
                    <h4 className="font-display text-base font-semibold tracking-tight">
                      {step.label}
                    </h4>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <header className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">
            {d.landing.value.eyebrow}
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {d.landing.value.heading}
          </h2>
        </header>
        <div className="grid gap-6 sm:grid-cols-3">
          {d.landing.proof.map((item) => (
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
          <p className="panel-label text-[0.7rem] text-muted-foreground">
            {d.landing.pricing.eyebrow}
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {d.landing.pricing.heading}
          </h2>
        </header>
        <div className="grid gap-6 sm:grid-cols-2">
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
                      <span className="font-display text-lg font-semibold tracking-tight">
                        {d.labels.plan[plan]}
                      </span>
                      {featured && (
                        <span className="panel-label text-[0.6rem] text-purple">
                          {d.landing.pricing.mostPopular}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-2xl font-semibold tabular-nums">
                      ${PLAN_PRICES[plan]}
                      <span className="text-sm text-muted-foreground">
                        {d.landing.pricing.perMonth}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{d.landing.plans[plan].line}</p>
                  </div>
                  <ul className="flex-1 space-y-2 text-sm">
                    {d.landing.plans[plan].features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground"
                        />
                        {t(feature, { limit: FREE_ANALYSES_LIMIT })}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={featured ? 'default' : 'outline'} className="w-full">
                    <Link href={ctaHref}>
                      {plan === 'free'
                        ? d.landing.pricing.startFree
                        : t(d.landing.pricing.choose, { plan: d.labels.plan[plan] })}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <p className="panel-label text-[0.65rem] text-muted-foreground">
          {d.landing.pricing.footnote}
        </p>
      </section>

      <section>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
            <h2 className="max-w-lg font-display text-2xl font-bold tracking-tight">
              {d.landing.finalCta.heading}
            </h2>
            <Button asChild size="lg">
              <Link href={ctaHref}>{d.landing.cta}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function HeroReadout({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  const { readout, sample } = dictionary.landing

  return (
    <Card className="animate-pop-in shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">{readout.domain}</span>
        <span className="flex items-center gap-1.5 panel-label text-[0.6rem] text-green">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-green" />
          {readout.liveTest}
        </span>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between rounded-md border border-green bg-green/10 p-3">
          <div>
            <p className="text-sm font-medium">{readout.winner}</p>
            <p className="text-xs text-muted-foreground">
              {t(readout.detail, { visitors: formatNumber(SAMPLE_VISITORS, locale) })}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold text-green">{readout.lift}</p>
            <p className="panel-label text-[0.6rem] text-green">{readout.significant}</p>
          </div>
        </div>
        {sample.map((hunch, i) => (
          <div key={SAMPLE_SECTIONS[i]} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionBadge section={SAMPLE_SECTIONS[i]} />
              <div className="flex items-center gap-3">
                <ScoreIndicator score={SAMPLE_SCORES[i].impact} kind="impact" />
                <ScoreIndicator score={SAMPLE_SCORES[i].effort} kind="effort" />
              </div>
            </div>
            <p className="mt-2 text-sm">{hunch.problem}</p>
            {'variant' in hunch && hunch.variant && (
              <div className="mt-3 space-y-1 rounded-sm bg-muted p-2.5">
                <p className="text-sm font-medium">{`"${hunch.variant}"`}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="panel-label text-[0.6rem] text-teal">{readout.why}</span>{' '}
                  {'evidence' in hunch ? hunch.evidence : null}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
