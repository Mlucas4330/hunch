'use client'

import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { CardDrawer } from '@/lib/enums'
import { cn } from '@/lib/utils'

export type Drawer = {
  id: CardDrawer
  label: string
  content: ReactNode
  testId?: string
  // Run once, the first time this drawer is opened. The alternates are written by a model on
  // demand, so opening the drawer is what buys them.
  onOpen?: () => void
}

/**
 * The second layer of a card: a row of toggles over one panel.
 *
 * **An open card is the decision and nothing else.** The rewritten line, or the sentence naming the
 * problem, is what the reader came for; the rationale, the screenshot and the alternates are what
 * they reach for afterwards, and stacking all four made opening a card feel like being handed a
 * page. One drawer is open at a time because they answer different questions -- reading two at once
 * was never the thing anyone wanted, and the height is the whole reason this exists.
 *
 * **Every drawer renders into the same panel**, and that is the second thing this component is for.
 * The four bodies had drifted into four treatments -- a purple-tinted bordered box for the "why", a
 * borderless grey box for the steps, another grey box for the alternates, and no container at all
 * for the preview -- so a reader clicking across the row watched the card restyle itself under
 * them. The shell lives here now and the callers pass content, never chrome.
 *
 * A drawer whose `content` is nullish renders no button at all. That is how the preview disappears
 * for a manual hypothesis and the alternates disappear for a reader who does not own the analysis:
 * the caller passes null rather than filtering the list, so the ids stay stable and the row order
 * does not shift under the reader.
 */
export function CardDrawers({
  drawers,
  defaultDrawer,
  className
}: {
  drawers: Drawer[]
  defaultDrawer?: CardDrawer
  className?: string
}) {
  const available = drawers.filter((drawer) => drawer.content !== null && drawer.content !== undefined)
  const [open, setOpen] = useState<CardDrawer | null>(
    defaultDrawer && available.some((drawer) => drawer.id === defaultDrawer) ? defaultDrawer : null
  )
  const [opened, setOpened] = useState<CardDrawer[]>(() => (open ? [open] : []))
  const panelId = useId()

  if (available.length === 0) return null

  function toggle(drawer: Drawer) {
    const next = open === drawer.id ? null : drawer.id
    setOpen(next)
    if (next && !opened.includes(next)) {
      setOpened((previous) => [...previous, next])
      drawer.onOpen?.()
    }
  }

  const active = available.find((drawer) => drawer.id === open)

  return (
    // `border-t` is the seam: the drawers are a layer under the decision, not more of it.
    <div className={cn('space-y-3 border-t pt-3', className)}>
      <div className="flex flex-wrap gap-2">
        {available.map((drawer) => {
          const isOpen = open === drawer.id
          return (
            <Button
              key={drawer.id}
              type="button"
              size="sm"
              // Bordered in both states, so the row reads as a set of controls rather than as three
              // pieces of text one of which happens to be boxed. What the open one changes is
              // weight and ground, never whether it is a button.
              variant="outline"
              className={cn(
                'h-8 px-3 text-xs font-medium',
                isOpen
                  ? 'border-foreground/25 bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-expanded={isOpen}
              aria-controls={`${panelId}-${drawer.id}`}
              onClick={() => toggle(drawer)}
              data-testid={drawer.testId}
            >
              {drawer.label}
            </Button>
          )
        })}
      </div>

      {active && (
        <div
          id={`${panelId}-${active.id}`}
          data-testid="card-drawer-panel"
          className="animate-fade-up space-y-2 rounded-md border bg-muted/40 p-3 text-sm leading-relaxed text-foreground"
        >
          {active.content}
        </div>
      )}
    </div>
  )
}
