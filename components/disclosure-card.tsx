import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function DisclosureCard({
  rank,
  badge,
  title,
  scores,
  openScores,
  defaultOpen,
  className,
  testId,
  children
}: {
  rank?: number
  badge?: ReactNode
  title: string
  scores?: ReactNode
  openScores?: ReactNode
  defaultOpen?: boolean
  className?: string
  testId?: string
  children: ReactNode
}) {
  // **Whether the title has to share its row decides how it behaves, and nothing else should.**
  // `group-open:order-last group-open:basis-full` exists so a title squeezed between a rank, a badge
  // and score chips gets a full row once the card is open. On a summary holding only a title and the
  // +/- marker there is nothing to make room from, and the reflow instead pushed the question onto a
  // second line with the marker stranded alone above it -- which is what the FAQ was doing. Derived
  // rather than a prop: the condition is the layout, so no call site can get it wrong.
  const crowded = rank !== undefined || Boolean(badge) || Boolean(scores) || Boolean(openScores)

  return (
    <Card className={cn('break-inside-avoid transition-colors focus-within:border-foreground/20', className)} data-testid={testId}>
      <details open={defaultOpen} className="group">
        <summary className="flex list-none flex-wrap items-center gap-3 rounded-lg p-4 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          {rank !== undefined && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {String(rank).padStart(2, '0')}
            </span>
          )}
          {badge}
          <h3
            className={cn(
              'min-w-0 flex-1 font-display leading-snug',
              crowded
                ? 'truncate text-sm font-medium group-open:order-last group-open:basis-full group-open:overflow-visible group-open:whitespace-normal group-open:text-base group-open:font-semibold'
                : // Free to wrap in place, closed or open: it already owns the row.
                  'text-base font-medium text-pretty group-open:font-semibold'
            )}
          >
            {title}
          </h3>
          {scores && (
            <span className={cn('flex shrink-0 items-center gap-1', openScores && 'group-open:hidden')}>
              {scores}
            </span>
          )}
          {openScores && (
            <span className="hidden shrink-0 items-center gap-2 group-open:flex">{openScores}</span>
          )}
          <span
            className="shrink-0 self-start pt-0.5 font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden
          >
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">-</span>
          </span>
        </summary>
        <div className="space-y-3 border-t p-4">{children}</div>
      </details>
    </Card>
  )
}
