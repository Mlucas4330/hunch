'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'
import { FOCUSABLE_SELECTOR } from '@/lib/constants'

/**
 * A modal dialog: backdrop, one panel, and the four behaviours a modal owes a keyboard.
 *
 * Portalled to the body for the same reason the pulse toast is: `position: fixed` only anchors to the
 * viewport while no ancestor carries a transform, and the landing page's wrapper animates with a
 * `both` fill mode that leaves one on the element forever.
 *
 * Escape closes, the backdrop closes, focus moves into the panel on open and returns to whatever had
 * it on close, and Tab cycles inside the panel rather than walking the page behind it. The page also
 * stops scrolling while it is open -- a modal over a scrolling page is how a reader loses the thing
 * they opened.
 */
export function Dialog({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const { dictionary } = useI18n()
  const panel = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    restoreTo.current = document.activeElement as HTMLElement | null

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    function focusable(): HTMLElement[] {
      return Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const stops = focusable()
      if (stops.length === 0) return

      const first = stops[0]
      const last = stops[stops.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !panel.current?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    focusable()[0]?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      restoreTo.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="dialog"
        className="animate-fade-up relative my-auto w-full max-w-md rounded-lg border bg-card p-5 shadow-elev-3"
      >
        <div className="flex items-start justify-between gap-4 pb-4">
          <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={dictionary.common.close}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body
  )
}
