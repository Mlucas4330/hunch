import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

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
