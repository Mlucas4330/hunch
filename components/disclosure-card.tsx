import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Every ranked row, on every surface. Native <details> rather than React state: it costs no client
// JS and renders identically inside the server-rendered public report and the client-rendered
// analysis list, so one component covers both.
//
// The top rows arrive with `defaultOpen` rather than as a separate always-open card component. That
// is the whole point of the shape: what a row starts as is a default, never something the reader is
// stuck with, so any row can be closed to get it out of the way.
//
// Open, the row is a full card and is dressed like one: the title stops truncating and `openScores`
// replaces the compact chips. Both score sets are rendered and swapped with `group-open:`, which
// keeps the whole thing CSS-only. They carry the same aria-labels, and a display:none element is not
// announced, so the swap is invisible to a screen reader.
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
    <Card className={cn('break-inside-avoid', className)} data-testid={testId}>
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4">
          {rank !== undefined && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {String(rank).padStart(2, '0')}
            </span>
          )}
          {badge}
          {/* A real heading, not a styled span: every row is one of these now, so the section's
              items would otherwise have no headings at all -- for a screen reader walking the page
              or for anything selecting them by role. */}
          <h3 className="min-w-0 flex-1 truncate font-display text-sm font-medium leading-snug group-open:overflow-visible group-open:whitespace-normal group-open:text-base group-open:font-semibold">
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
          <span className="font-mono text-xs text-muted-foreground" aria-hidden>
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">-</span>
          </span>
        </summary>
        <div className="space-y-3 border-t p-4">{children}</div>
      </details>
    </Card>
  )
}
