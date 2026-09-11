import { DisclosureCard } from '@/components/disclosure-card'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

/**
 * The landing page's FAQ and its `FAQPage` structured data, built off one array so the answer a reader
 * opens and the answer a crawler quotes cannot drift apart. Server rendered, so both are in the
 * initial HTML. See docs/seo.md.
 */
export function LandingFaq({ copy }: { copy: Dictionary['landing']['faq'] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  }

  return (
    <section>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
        <h2 className="text-balance font-display text-2xl font-bold tracking-tight lg:sticky lg:top-24 lg:self-start">
          {copy.heading}
        </h2>

        <div className="min-w-0 space-y-3">
          {copy.items.map((item) => (
            <DisclosureCard key={item.question} title={item.question}>
              <p className="text-sm text-muted-foreground">{item.answer}</p>
            </DisclosureCard>
          ))}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </section>
  )
}
