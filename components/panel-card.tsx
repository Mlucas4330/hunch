import type { ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * A card whose heading is a labelled bar, and whose bar is the only thing that opens it.
 *
 * **One component because there are callers that had already started to differ.** The four analysis
 * sections that replaced the tabs and the terms section that closes the document are the same
 * object: a heading somebody clicks, a summary of what is inside it on the same line, and a body.
 * Written twice it drifts the first time either is touched, which is the failure `RankedListHeader`
 * exists to stop one level up.
 *
 * **The bar is the whole `<summary>`, and that is a fix rather than a style.** The readout's group
 * cards, which used this before they moved to `DisclosureCard`, first put the label in the bar and
 * the score on a second row below it with both inside the summary: two visually distinct strips, one
 * behaviour, and a reader who clicked the score row and watched the card collapse had found a
 * control nobody told them about. Everything that toggles is on one line, and everything below it is
 * content that does not.
 *
 * **The bar is the card's own surface, not an inverted one.** It was `bg-foreground` for a while and
 * the contrast did make a group read as a heading -- but a page of black bars is a page where the
 * headings outweigh what they head, and it put the report's only inverted surface on its most
 * ordinary furniture. The `border-b`, the mono label and the hover carry the same job at the weight
 * a heading should have. See docs/components.md.
 *
 * `trailing` is what the bar says about the body without opening it -- a count of cards. It sits
 * before the chevron and must stay short enough not to wrap.
 */
export function PanelCard({
  icon: Icon,
  label,
  trailing = null,
  defaultOpen = false,
  testId,
  className,
  children
}: {
  icon: LucideIcon
  label: string
  trailing?: ReactNode
  defaultOpen?: boolean
  testId?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Card
      className={cn('overflow-hidden break-inside-avoid', className)}
      data-testid={testId}
    >
      <details open={defaultOpen} className="group">
        <summary className="flex list-none items-center gap-3 border-b px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="panel-label min-w-0 flex-1 text-[0.65rem] leading-snug">{label}</span>
          {trailing}
          <ChevronDown
            className="size-4 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        {children}
      </details>
    </Card>
  )
}
