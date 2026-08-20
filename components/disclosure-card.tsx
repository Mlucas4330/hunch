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
          <h3 className="min-w-0 flex-1 truncate font-display text-sm font-medium leading-snug group-open:order-last group-open:basis-full group-open:overflow-visible group-open:whitespace-normal group-open:text-base group-open:font-semibold">
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
          <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground" aria-hidden>
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">-</span>
          </span>
        </summary>
        <div className="space-y-3 border-t p-4">{children}</div>
      </details>
    </Card>
  )
}
