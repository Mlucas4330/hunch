'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

// Opens on hover, on click and on keyboard focus. It used to be click-only, which is not what an `i`
// affords -- readers hover it and conclude it is broken.
//
// Dismissal is a document-level pointerdown listener rather than a full-screen `fixed inset-0`
// catcher element. That element did not work here: `.animate-fade-up` runs with
// `animation-fill-mode: both`, so the analysis page's root keeps `transform: translateY(0)` forever
// after the animation, and a transform other than `none` makes that element the containing block for
// its `position: fixed` descendants (and opens a new stacking context around them). The catcher
// covered the analysis container instead of the viewport. A listener has no geometry to get wrong.
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
  // Hover and click are tracked apart, so a click on an already-hovered icon pins the panel instead
  // of toggling it shut -- which is what a single `open` flag did, and it made the icon look broken
  // to anyone whose pointer reached it before their click did.
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
          // Anchored to a 16px icon, so an unbounded width runs off the viewport wherever the icon
          // sits near an edge.
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
