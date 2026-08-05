'use client'

import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

export function InfoHint({
  label,
  children,
  align = 'left'
}: {
  label?: string
  children: ReactNode
  align?: 'left' | 'right'
}) {
  const { dictionary } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label ?? dictionary.infoHint.defaultLabel}
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
