import type { CSSProperties, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SECTION_ANCHOR_CLASS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function DisclosureCard({
  id,
  score,
  badge,
  title,
  defaultOpen,
  className,
  style,
  testId,
  children
}: {
  /** Anchor target, so a fix card can be linked to from the triage block and from the readout. */
  id?: string
  /** The impact rail. Omitted on a row that has no score, like the landing FAQ. */
  score?: ReactNode
  badge?: ReactNode
  title: string
  defaultOpen?: boolean
  className?: string
  /** Carries `--index` for the staggered arrival. See app/globals.css. */
  style?: CSSProperties
  testId?: string
  children: ReactNode
}) {
  return (
    <Card
      id={id}
      style={style}
      className={cn(
        'overflow-hidden break-inside-avoid transition-colors focus-within:border-foreground/20',
        id && SECTION_ANCHOR_CLASS,
        className
      )}
      data-testid={testId}
    >
      <details open={defaultOpen} className="group">
        {/* **The score is a rail, not a chip in the header row.**
         *
         * It used to be five typographic treatments fighting over one wrapping line -- a mono rank,
         * a coloured pill, a coral flag, and the word IMPACTO next to ten bars next to `9/10` --
         * with the title pushed underneath them. The meter alone was `shrink-0` and ate roughly
         * 290px, which is what forced the title onto its own row and what made an open card need a
         * whole second set of score elements swapped in by CSS.
         *
         * The rail fixes all of it at once. The number is a fixed-width block down the left edge,
         * coloured by impact, so scanning the list reads 9, 8, 7, 7, 5, 4 in a column -- the
         * ranking made visual. **It absorbs the rank**, which was a second number saying nearly the
         * same thing: the list is sorted by impact, so `01` beside `9/10` was the same fact twice.
         * And it is identical open or closed, so the `scores` / `openScores` pair is gone.
         */}
        <summary className="flex list-none items-stretch rounded-lg hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          {score}
          <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
            {badge && <div className="flex flex-wrap items-center gap-2">{badge}</div>}
            {/* Free to wrap, in both states: it owns the row now. `text-pretty` keeps a one-word
                last line from happening. */}
            <h3 className="text-pretty font-display text-base font-medium leading-snug group-open:font-semibold">
              {title}
            </h3>
          </div>
          {/* One icon that turns over, rather than two glyphs swapped by `group-open:`. It was a
              literal `+` and `-` in a mono span -- readable, but a different idiom from every other
              control in the product, all of which are lucide. `aria-hidden`: the accessible name is
              the `<h3>` inside the summary, and `<details>` already exposes its own open state. */}
          <span className="shrink-0 self-start p-4 pl-2 text-muted-foreground transition-colors group-hover:text-foreground">
            <ChevronDown
              aria-hidden
              className="h-4 w-4 transition-transform duration-150 ease-out group-open:rotate-180"
            />
          </span>
        </summary>
        <div className="space-y-3 border-t p-4">{children}</div>
      </details>
    </Card>
  )
}
