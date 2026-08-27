'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { Info } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'
import { TOOLTIP_VIEWPORT_MARGIN_PX } from '@/lib/constants'

/**
 * A question mark's worth of explanation, pinned open on click and shown on hover.
 *
 * **The panel places itself, and that replaced an `align` prop nobody ever passed.** The tooltip is
 * absolutely positioned against a 16px button, so anchoring it `left-0` put it off the right edge of
 * the page whenever the trigger sat near that edge -- which produced a horizontal scrollbar on the
 * whole document, on desktop as well as on a phone. `align="right"` was the escape hatch, and it was
 * the wrong shape twice over: every call site had to know where it rendered, and a trigger in the
 * *middle* of a narrow screen overflows whichever side it opens to.
 *
 * So it measures instead. The panel renders at `left-0`, and a layout effect pulls it back inside
 * the viewport before paint. That covers every position, both edges, and a resize.
 */
export function InfoHint({ label, children }: { label?: string; children: ReactNode }) {
  const { dictionary } = useI18n()
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [shift, setShift] = useState(0)
  const wrapper = useRef<HTMLSpanElement>(null)
  const tooltip = useRef<HTMLSpanElement>(null)
  const tooltipId = useId()
  const open = hovered || pinned

  const place = useCallback(() => {
    const node = tooltip.current
    if (!node) return

    // Measured at its unshifted position, so the correction never compounds across reflows.
    const rect = node.getBoundingClientRect()
    const left = rect.left - shift
    const right = rect.right - shift
    const margin = TOOLTIP_VIEWPORT_MARGIN_PX

    // **`clientWidth`, not `window.innerWidth`.** `innerWidth` counts the vertical scrollbar, so on
    // a desktop with one the panel was allowed to run ~15px past where the document actually ends
    // -- enough to add a horizontal scrollbar to the whole page, which is the bug this is here to
    // stop. `clientWidth` is the width content really has.
    const available = document.documentElement.clientWidth

    if (right > available - margin) {
      setShift(Math.min(0, available - margin - right))
    } else if (left < margin) {
      setShift(Math.max(0, margin - left))
    } else {
      setShift(0)
    }
  }, [shift])

  useLayoutEffect(() => {
    if (!open) {
      setShift(0)
      return
    }
    place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, place])

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
          ref={tooltip}
          id={tooltipId}
          role="tooltip"
          style={{ transform: `translateX(${shift}px)` }}
          className="absolute left-0 top-6 z-50 block w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-md border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-md"
        >
          {children}
        </span>
      )}
    </span>
  )
}
