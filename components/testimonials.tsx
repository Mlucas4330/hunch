import { Quote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

/**
 * Renders nothing until there is something true to render.
 *
 * `dictionary.landing.testimonials.items` starts empty, and this returning null takes the heading
 * with it, so the landing page never carries an orphaned "What people say" over a blank strip.
 * Filling the array in both dictionaries is the whole deploy -- there is no flag and no second place
 * to switch it on.
 *
 * Quotes are the one thing on this page a reader cannot check against their own site, which is
 * exactly why placeholder ones must never ship. See docs/invariants.md.
 *
 * **One channel across all three cards**, rather than the rotation the pain deck uses: this is the
 * section that has to read as a set, and three hues would make it three unrelated boxes again.
 * Purple is the product's primary accent, and it is what `SECTION_BADGE_CLASS.social_proof` paints.
 */
export function Testimonials({ copy }: { copy: Dictionary['landing']['testimonials'] }) {
  if (copy.items.length === 0) return null

  return (
    <section className="space-y-10">
      <header className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <h2 className="font-display text-2xl font-bold tracking-tight">{copy.heading}</h2>
      </header>

      <div className="grid gap-6 sm:grid-cols-3">
        {copy.items.map((item, i) => (
          <Card key={i} className="border-l-2 border-purple">
            <CardContent className="flex h-full flex-col gap-4 p-5">
              {/* An icon rather than a typographic quote mark: CLAUDE.md rules out unicode symbols,
                  and a straight ASCII quote at display size reads as a stray character. */}
              <Quote aria-hidden className="h-5 w-5 shrink-0 text-purple" />

              <blockquote className="flex-1 text-pretty text-sm leading-relaxed">
                {item.quote}
              </blockquote>

              <footer className="flex items-center gap-3 border-t pt-3">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple/15 font-display text-sm font-semibold text-purple"
                >
                  {item.name.trim().charAt(0)}
                </span>
                <span className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold tracking-tight">
                    {item.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.role}, {item.company}
                  </p>
                </span>
              </footer>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
