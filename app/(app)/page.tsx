import Link from 'next/link'
import { auth } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AnalysisPulse } from '@/components/analysis-pulse'
import { CreditPacks } from '@/components/credit-packs'
import {
  analysisPulse,
  publicLeaderboard,
  type PublicScore,
  type PulseEntry
} from '@/lib/analyses'
import {
  BLOG_PATH,
  MERCADOPAGO_PROVIDER,
  PULSE_MIN_ENTRIES,
  READOUT_SEVERITY_CLASS,
  STRIPE_PROVIDER
} from '@/lib/constants'
import { mercadoPagoEnabled } from '@/lib/mercadopago'
import { AI_POST_SLUG, type ReadoutSeverity } from '@/lib/enums'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import { cn } from '@/lib/utils'

const PAIN_CHANNELS = ['border-coral', 'border-purple', 'border-teal']

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.landing, path: '/', index: true })
}

export default async function LandingPage() {
  const session = await auth()
  const locale = await getLocale()
  const d = dictionaryFor(locale)
  const ctaHref = session?.user ? '/dashboard' : '/auth/signin'

  // Rendered here so the board is in the HTML rather than appearing a poll later. Below
  // PULSE_MIN_ENTRIES there is no board, only a couple of rows dressed as one, so the whole section
  // is left out -- nothing on it is ever seeded. See docs/invariants.md.
  const [leaderboard, pulse] = await pulseData()
  const showPulse = leaderboard.length >= PULSE_MIN_ENTRIES

  return (
    <div className="animate-fade-up space-y-24 pb-12">
      <section className="grid items-center gap-10 pt-6 lg:grid-cols-[1fr_1.15fr]">
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

        <HeroReadout dictionary={d} />
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
            <Card key={i} className={cn('border-l-2', PAIN_CHANNELS[i])}>
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

      <section id="ai" className="space-y-10 scroll-mt-20">
        <header className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">
            {d.landing.aiSearch.eyebrow}
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {d.landing.aiSearch.heading}
          </h2>
          <p className="max-w-2xl pt-1 text-sm text-muted-foreground">{d.landing.aiSearch.body}</p>
        </header>
        <div className="grid gap-6 sm:grid-cols-3">
          {d.landing.aiSearch.points.map((point, i) => (
            <Card key={i} className="border-l-2 border-teal">
              <CardContent className="space-y-2 p-5">
                <h3 className="font-display text-base font-semibold tracking-tight">
                  {point.title}
                </h3>
                <p className="text-sm text-muted-foreground">{point.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex border-t pt-4">
          <Link
            href={`${BLOG_PATH}/${AI_POST_SLUG}`}
            className="panel-label text-[0.7rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            {d.landing.aiSearch.link}
          </Link>
        </div>
      </section>

      <section id="how" className="space-y-10 scroll-mt-20">
        <header className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">{d.landing.how.eyebrow}</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">{d.landing.how.heading}</h2>
          <p className="max-w-2xl pt-1 text-sm text-muted-foreground">{d.landing.how.intro}</p>
        </header>
        <ol className="grid gap-6 sm:grid-cols-3">
          {d.landing.steps.map((step, i) => (
            <li key={i} className="space-y-3">
              <span className="panel-label text-sm text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="h-px bg-border" />
              <h3 className="font-display text-base font-semibold tracking-tight">{step.label}</h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
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
          {d.landing.proof.map((item, i) => (
            <Card key={i}>
              <CardContent className="space-y-2 p-5">
                <h3 className="font-display text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {showPulse && (
        <section className="space-y-10">
          <header className="space-y-1">
            <p className="panel-label text-[0.7rem] text-muted-foreground">
              {d.landing.leaderboard.eyebrow}
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {d.landing.leaderboard.heading}
            </h2>
            <p className="max-w-2xl pt-1 text-sm text-muted-foreground">
              {d.landing.leaderboard.intro}
            </p>
          </header>
          <AnalysisPulse initial={{ leaderboard, pulse }} />
        </section>
      )}

      <section className="space-y-6" id="credits">
        <header className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">{d.credits.eyebrow}</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">{d.credits.heading}</h2>
          <p className="max-w-2xl pt-1 text-sm text-muted-foreground">{d.credits.body}</p>
        </header>
        <CreditPacks
          signedIn={Boolean(session?.user)}
          provider={mercadoPagoEnabled() ? MERCADOPAGO_PROVIDER : STRIPE_PROVIDER}
        />
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

// This page is where ad traffic lands and it used to need no database at all, so the section it gained
// must not be able to take it down: a query that cannot run costs the board, never the page.
async function pulseData(): Promise<[PublicScore[], PulseEntry[]]> {
  try {
    return await Promise.all([publicLeaderboard(), analysisPulse()])
  } catch (error) {
    console.error('[landing] pulse read failed', error)
    return [[], []]
  }
}

function HeroReadout({ dictionary }: { dictionary: Dictionary }) {
  const { heroCard } = dictionary.landing

  return (
    <Card className="animate-pop-in animate-hero-shine shadow-md">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <span className="font-mono text-xs text-muted-foreground">{heroCard.domain}</span>
      </div>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">{heroCard.scoreLabel}</p>
          <p className="font-display text-7xl font-bold tabular-nums tracking-tight">
            {heroCard.score}
            <span className="text-3xl text-muted-foreground">{heroCard.outOf}</span>
          </p>
        </div>

        <div className="space-y-3">
          {heroCard.rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-base">
              <span className="text-muted-foreground">{row.label}</span>
              <span
                className={cn(
                  'rounded-sm px-2 py-1 font-mono text-sm tabular-nums',
                  READOUT_SEVERITY_CLASS[row.severity as ReadoutSeverity]
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
