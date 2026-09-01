'use client'

import type { CSSProperties } from 'react'
import { FlowCategoryBadge } from '@/components/flow-category-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { SectionLink } from '@/components/section-link'
import { useI18n } from '@/components/i18n-provider'
import { Card } from '@/components/ui/card'
import { fixAnchor, SECTION_ANCHOR_CLASS, START_HERE_COUNT } from '@/lib/constants'
import type { FlowFix } from '@/db/schema'
import { cn } from '@/lib/utils'

/**
 * The first thing to do, and only the first thing.
 *
 * A generated report hands over as many as twenty-two ranked cards across four sections. Every one of
 * them is ranked, and none of them is the top of the page -- so the reader's first question, "of all
 * this, what do I do on Monday", was answered nowhere. This answers it and nothing else.
 *
 * **It is a re-presentation and never a new claim.** Every row is an existing `flow_fixes` row: its
 * own title, its own category badge, its own impact number, linking to its own card. Nothing is
 * summarised, rewritten, merged or scored here -- if a title reads badly the fix is in the prompt
 * that wrote it, not in this component. Two consequences that must hold:
 *
 * - **No predicted outcome, in any wording.** Not "do this to lift signups", not "highest ROI", not
 *   "quick win". A block called "start here" is precisely where that sentence wants to be written,
 *   and docs/invariants.md forbids it on every surface: nobody measured what any of these produce.
 *   What the ranking asserts is the impact score the fix already carries, which is the same claim the
 *   card below it makes.
 * - **It renders only on a generated report**, because it is made of generated rows. On a free
 *   analysis there is nothing to rank and the reader gets the `UnlockWall` instead, so the readout
 *   never grows an affordance that reads as a tease. See docs/invariants.md.
 *
 * Sorted by impact across both fix families rather than per section: the point is a single list, and
 * a reader who has to compare four ranked lists to find the top of them is doing the work again.
 * `position` breaks ties so the order is stable against the order the sections render in.
 */
export function StartHere({ fixes, className }: { fixes: FlowFix[]; className?: string }) {
  const { dictionary } = useI18n()
  const copy = dictionary.report.startHere

  const top = [...fixes]
    .sort((a, b) => b.impactScore - a.impactScore || a.position - b.position)
    .slice(0, START_HERE_COUNT)

  if (top.length === 0) return null

  return (
    <section
      id="start"
      className={cn(SECTION_ANCHOR_CLASS, 'space-y-3', className)}
      data-testid="start-here"
    >
      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{copy.eyebrow}</p>
        <h2 className="text-balance font-display text-xl font-bold tracking-tight">{copy.title}</h2>
      </div>

      <Card className="divide-y overflow-hidden">
        {top.map((fix, index) => (
          <SectionLink
            key={fix.id}
            target={fixAnchor(fix.id)}
            className="animate-stagger-in flex items-stretch hover:bg-muted/50"
            // The rows arrive in order rather than together. `--index` has to sit on the animated
            // element itself, not inside it -- the delay is read from this element's own computed
            // style. See app/globals.css.
            style={{ '--index': index } as CSSProperties}
          >
            <ScoreIndicator score={fix.impactScore} />
            <span className="flex min-w-0 flex-1 flex-col gap-1 p-4">
              <span className="flex flex-wrap items-center gap-2">
                <FlowCategoryBadge category={fix.category} />
              </span>
              <span className="text-pretty font-display text-base font-medium leading-snug">
                {fix.title}
              </span>
            </span>
          </SectionLink>
        ))}
      </Card>
    </section>
  )
}
