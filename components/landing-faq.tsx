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
 *
 * **Two columns above `lg`: the heading anchors on the left, the questions run down the right.**
 * Stacked, the rows stretched the full 1440px measure, and a question set in a line that long is one
 * nobody scans -- the eye has no left edge to return to. Splitting them puts the list at a width a
 * reader sweeps in one movement and gives the heading somewhere to be other than on top of it.
 *
 * Three details carry it:
 *
 * - **`lg` and not `md`.** On a tablet these two columns would leave each question a pocket-width
 *   column with more wrapping than words. One column is the default and the split is the exception,
 *   not the other way round.
 * - **`min-w-0` on the list column.** A grid item refuses to shrink below its content without it, so
 *   one long unbroken question would push the whole track past the viewport. See docs/components.md.
 * - **`self-start` beside `sticky`.** A grid item stretches to its row by default, which leaves a
 *   sticky element no slack to move within -- it would simply never stick. There are seven rows and
 *   they are far taller than the heading, so the heading holds while they scroll.
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
    <section id="faq" className="scroll-mt-20">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
        <header className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <p className="panel-label text-micro text-muted-foreground">{copy.eyebrow}</p>
          <h2 className="text-balance font-display text-2xl font-bold tracking-tight">
            {copy.heading}
          </h2>
        </header>

        <div className="min-w-0 space-y-3">
          {copy.items.map((item) => (
            <DisclosureCard key={item.question} title={item.question}>
              <p className="text-sm text-muted-foreground">{item.answer}</p>
            </DisclosureCard>
          ))}
        </div>
      </div>

      {/* Outside the grid on purpose. A `<script>` is `display: none`, so as a grid child it creates
          no track today -- but an invisible item sitting among the columns is a trap for whoever
          edits them next. Still server-rendered: this component has no `'use client'`, which is what
          keeps the answers and this schema in the initial HTML. See docs/seo.md. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </section>
  )
}
