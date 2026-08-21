import { DisclosureCard } from '@/components/disclosure-card'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

/**
 * The FAQ, and the structured data for it, off one array.
 *
 * The JSON-LD is generated from `copy.items` rather than written beside it, so the answer a reader
 * opens and the answer a crawler quotes can never drift apart -- which is the failure the AI
 * visibility section two screens up is about. See docs/seo.md.
 *
 * Rows are DisclosureCard, the same native `<details>` every ranked row on every other surface uses.
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
    <section id="faq" className="space-y-10 scroll-mt-20">
      <header className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <h2 className="font-display text-2xl font-bold tracking-tight">{copy.heading}</h2>
      </header>
      <div className="space-y-3">
        {copy.items.map((item) => (
          <DisclosureCard key={item.question} title={item.question}>
            <p className="text-sm text-muted-foreground">{item.answer}</p>
          </DisclosureCard>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </section>
  )
}
