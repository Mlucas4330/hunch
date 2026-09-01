'use client'

import type { CSSProperties, ReactNode } from 'react'
import { revealAnchor } from '@/lib/anchor'
import { cn } from '@/lib/utils'

/**
 * An in-page link that lands on something the reader can actually see.
 *
 * A real `<a href="#id">`, so it is keyboard reachable, shows its target in the status bar and still
 * works with JavaScript off -- the click handler only improves on the default by opening the closed
 * disclosures in front of the target first. See lib/anchor.ts for why that matters here.
 *
 * `preventDefault` runs only when the target was found and revealed. A stale id falls through to the
 * browser's own handling rather than becoming a link that silently does nothing.
 */
export function SectionLink({
  target,
  className,
  style,
  children
}: {
  target: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <a
      href={`#${target}`}
      style={style}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return
        if (revealAnchor(target)) event.preventDefault()
      }}
      className={cn('transition-colors', className)}
    >
      {children}
    </a>
  )
}
