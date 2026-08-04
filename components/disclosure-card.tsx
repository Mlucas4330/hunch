import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// A collapsed row that opens into a full card. Native <details> rather than React state: it costs no
// client JS and renders identically inside the server-rendered public report and the client-rendered
// analysis list, so one component covers both surfaces.
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
          <span className="min-w-0 flex-1 truncate text-sm font-medium group-open:overflow-visible group-open:whitespace-normal">
            {title}
          </span>
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
