'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * A `<details>` panel that closes the three ways a reader expects one to.
 *
 * **A bare `<details>` closes on its own summary and on nothing else.** Click the page behind it and
 * it stays open, which on a phone means the menu covers what the reader just tried to tap. The
 * element gives us the toggle, the keyboard and the closed-by-default markup for free; what it does
 * not give us is dismissal, so that part is here.
 *
 * Three ways out, and each is a different intent: a click outside is "I am done with this", Escape is
 * the keyboard's version of the same, and a route change is "I used it". They are one component
 * rather than one per menu because the nav has two of these (the hamburger and the account panel),
 * and a dismissal that worked in one and not the other is the bug this replaces.
 *
 * `pointerdown` rather than `click`: it fires before focus moves, so a menu never closes and reopens
 * when the reader presses down on the summary of the menu that is already open.
 */
export function Dropdown({
  summary,
  summaryClassName,
  panelClassName,
  className,
  label,
  testId,
  children
}: {
  summary: ReactNode
  summaryClassName?: string
  panelClassName?: string
  className?: string
  label?: string
  testId?: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.open = false
  }, [pathname])

  useEffect(() => {
    function close() {
      if (ref.current?.open) ref.current.open = false
    }

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.open) return
      if (event.target instanceof Node && ref.current.contains(event.target)) return
      close()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <details ref={ref} className={className} data-testid={testId}>
      <summary aria-label={label} className={summaryClassName}>
        {summary}
      </summary>
      <div className={panelClassName}>{children}</div>
    </details>
  )
}
