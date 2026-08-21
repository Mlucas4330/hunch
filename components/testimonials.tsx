import { Card, CardContent } from '@/components/ui/card'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

/**
 * Renders nothing until there is something true to render.
 *
 * `dictionary.landing.testimonials.items` ships empty, and this returning null takes the heading with
 * it, so the landing page has no orphaned "What people say" over a blank strip. Filling the array in
 * both dictionaries is the whole deploy -- there is no flag and no second place to switch it on.
 *
 * Quotes are the one thing on this page that cannot be checked against the reader's own site, which
 * is exactly why placeholder ones must never ship. See docs/invariants.md.
 */
export function Testimonials({
  copy
}: {
  copy: Dictionary['landing']['testimonials']
}) {
  if (copy.items.length === 0) return null

  return (
    <section className="space-y-10">
      <header className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <h2 className="font-display text-2xl font-bold tracking-tight">{copy.heading}</h2>
      </header>
      <div className="grid gap-6 sm:grid-cols-3">
        {copy.items.map((item, i) => (
          <Card key={i}>
            <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
              <blockquote className="text-sm leading-relaxed">{item.quote}</blockquote>
              <footer className="space-y-0.5 border-t pt-3">
                <p className="font-display text-sm font-semibold tracking-tight">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.role}, {item.company}
                </p>
              </footer>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
