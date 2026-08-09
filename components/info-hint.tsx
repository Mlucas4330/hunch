'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
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
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const wrapper = useRef<HTMLSpanElement>(null)
  const tooltipId = useId()
  const open = hovered || pinned

  useEffect(() => {
    if (!pinned) return

    function onPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setPinned(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPinned(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pinned])

  return (
    <span
      ref={wrapper}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={label ?? dictionary.infoHint.defaultLabel}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setPinned((p) => !p)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute top-6 z-50 block w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-md border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-md',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children}
        </span>
      )}
    </span>
  )
}
