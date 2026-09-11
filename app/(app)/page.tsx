import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Gauge, History, Link2, ListChecks, Scale, type LucideIcon } from 'lucide-react'
import { ANALYSIS_SECTION_ICON } from '@/components/analysis-section-icon'
import { LandingFaq } from '@/components/landing-faq'
import { LandingPricing } from '@/components/landing-pricing'
import { PanelCard } from '@/components/panel-card'
import { RichText } from '@/components/rich-text'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/current-user'
import { BLOG_PATH, CONTACT_EMAIL_URL, POST_SIGNIN_REDIRECT, SIGNIN_PATH } from '@/lib/constants'
import { AI_POST_SLUG, ANALYSIS_TAB } from '@/lib/enums'
import { dictionaryFor, getDictionary, getLocale, type Dictionary } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'
import { cn } from '@/lib/utils'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.landing, path: '/', index: true })
}

/**
 * The landing page, for an agency that is not a customer yet. A signed-in reader already is one and
 * goes to the dashboard. It sells nothing in the app: the subscription is agreed by email, so the two
 * actions are contact and sign in. See docs/analysis-ui.md.
 */
export default async function LandingPage() {
  const user = await getCurrentUser()
  if (user) redirect(POST_SIGNIN_REDIRECT)

  const locale = await getLocale()
  const d = dictionaryFor(locale)
  const copy = d.landing

  return (
    <div className="animate-fade-up space-y-24 pb-12">
      <section className="grid items-center gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <p className="panel-label text-micro text-muted-foreground">{copy.eyebrow}</p>
          <h1 className="text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            {copy.headlineTop}
            <span className="block text-muted-foreground">{copy.headlineBottom}</span>
          </h1>
          <p className="max-w-md text-base text-muted-foreground">{copy.lead}</p>
          <LandingActions copy={copy.actions} />
        </div>

        <ReportOutline dictionary={d} />
      </section>

      <section className="space-y-10">
        <h2 className="max-w-2xl text-balance font-display text-2xl font-bold tracking-tight">
          {copy.how.heading}
        </h2>
        <ol className="grid gap-8 md:grid-cols-3">
          {copy.how.steps.map((step) => (
            <li key={step.title} className="space-y-2 border-t pt-5">
              <h3 className="font-display text-lg font-semibold tracking-tight">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <h2 className="text-balance font-display text-2xl font-bold tracking-tight">{copy.ai.heading}</h2>
          <p className="max-w-xl text-sm text-muted-foreground">{copy.ai.body}</p>
          <Link
            href={`${BLOG_PATH}/${AI_POST_SLUG}`}
            className="panel-label inline-block text-micro text-muted-foreground transition-colors hover:text-foreground max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
          >
            {copy.ai.link}
          </Link>
        </div>

        <ul className="space-y-6">
          {copy.ai.points.map((point) => (
            <li key={point.title} className="space-y-1.5 border-l-2 border-purple-soft pl-4">
              <h3 className="font-display text-base font-semibold tracking-tight">{point.title}</h3>
              <p className="text-sm text-muted-foreground">{point.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-10">
        <h2 className="text-balance font-display text-2xl font-bold tracking-tight">{copy.report.heading}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ReportCell icon={ListChecks} copy={copy.report.errors} className="bg-card md:col-span-2" />
          <ReportCell icon={Gauge} copy={copy.report.score} className="bg-muted/40" />
          <ReportCell icon={Scale} copy={copy.report.compare} className="bg-muted/40" />
          <ReportCell icon={History} copy={copy.report.history} className="border-purple-soft bg-purple/10" />
          <ReportCell icon={Link2} copy={copy.report.link} className="bg-card" />
        </div>
      </section>

      <LandingPricing copy={copy.pricing} locale={locale} />

      <LandingFaq copy={copy.faq} />

      <section>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-6 p-10 text-center">
            <h2 className="max-w-lg text-balance font-display text-2xl font-bold tracking-tight">
              {copy.finalCta.heading}
            </h2>
            <LandingActions copy={copy.actions} className="justify-center" />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function LandingActions({
  copy,
  className
}: {
  copy: Dictionary['landing']['actions']
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <Button asChild size="lg">
        <a href={CONTACT_EMAIL_URL}>{copy.contact}</a>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href={SIGNIN_PATH}>{copy.signIn}</Link>
      </Button>
    </div>
  )
}

// The report's own section bars, carrying the question each section answers. A real component rather
// than a picture of one, and it shows no score, so nothing on it is a number somebody could mistake
// for data.
function ReportOutline({ dictionary }: { dictionary: Dictionary }) {
  return (
    <div role="group" aria-label={dictionary.landing.preview.label} className="space-y-3">
      {ANALYSIS_TAB.map((tab, index) => (
        <div key={tab} className="animate-stagger-in" style={{ '--index': index } as CSSProperties}>
          <PanelCard
            icon={ANALYSIS_SECTION_ICON[tab]}
            label={dictionary.analysis.sections[tab]}
            defaultOpen={index === 0}
            className={cn(index === 0 && 'animate-shine')}
          >
            <div className="space-y-2 p-4 sm:p-5">
              <p className="text-balance font-display text-lg font-semibold tracking-tight">
                {dictionary.analysis.sectionQuestions[tab]}
              </p>
              {tab !== 'copy' && (
                <p className="text-sm text-muted-foreground">
                  <RichText>{dictionary[tab].hint}</RichText>
                </p>
              )}
            </div>
          </PanelCard>
        </div>
      ))}
    </div>
  )
}

function ReportCell({
  icon: Icon,
  copy,
  className
}: {
  icon: LucideIcon
  copy: { title: string; body: string }
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border p-6', className)}>
      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      <h3 className="font-display text-lg font-semibold tracking-tight">{copy.title}</h3>
      <p className="text-sm text-muted-foreground">{copy.body}</p>
    </div>
  )
}
