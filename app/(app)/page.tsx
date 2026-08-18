import Link from 'next/link'
import { auth } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { WaitlistForm } from '@/components/waitlist-form'
import type { Section } from '@/lib/enums'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import { cn } from '@/lib/utils'

const SAMPLE_SECTIONS: Section[] = ['headline', 'cta', 'social_proof']
const SAMPLE_SCORES = [
  { impact: 9, effort: 2 },
  { impact: 7, effort: 1 },
  { impact: 6, effort: 3 }
]

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
      <section className="space-y-10" id="contact">
        <header className="space-y-1">
          <p className="panel-label text-[0.7rem] text-muted-foreground">
            {d.landing.contact.eyebrow}
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {d.landing.contact.heading}
          </h2>
          <p className="max-w-2xl pt-1 text-sm text-muted-foreground">{d.landing.contact.body}</p>
        </header>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <WaitlistForm source="contact" copy={d.landing.contact.form} />
            </CardContent>
          </Card>
          <ul className="space-y-3 self-center text-sm">
            {d.landing.contact.points.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                {point}
              </li>
            ))}
          </ul>
        </div>
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

function HeroReadout({ dictionary }: { dictionary: Dictionary }) {
  const { readout, sample } = dictionary.landing

  return (
    <Card className="animate-pop-in shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">{readout.domain}</span>
      </div>
      <CardContent className="space-y-3 p-4">
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
