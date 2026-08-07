import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// The reasoning behind a ranked item, on every surface that shows one. It exists as a component
// rather than as a line of markup per card because it used to be neither consistent nor readable:
// a flow fix's evidence rendered as 12px muted text under the loud steps panel, the public report
// hid the same text inside a 9.6px <details> summary, and a hypothesis's rationale -- which the
// model is required to write -- was never rendered at all.
//
// So it is dressed as a panel, in body-sized foreground text. A reader who skims the card still
// sees that an argument was made.
export function WhyBlock({
  label,
  children,
  className
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'space-y-1 break-inside-avoid rounded-md border border-purple/40 bg-purple/5 p-3',
        className
      )}
    >
      <p className="panel-label text-[0.6rem] text-purple">{label}</p>
      <div className="space-y-1 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  )
}
