'use client'

import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// A small clickable "how this works" icon. Clicking toggles a short explanation panel;
// clicking anywhere outside closes it.
export function InfoHint({
  label = 'How this step works',
  children,
  align = 'left'
}: {
  label?: string
  children: ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span
            role="tooltip"
            className={cn(
              'absolute top-6 z-50 w-72 rounded-md border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-md',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {children}
          </span>
        </>
      )}
    </span>
  )
}
