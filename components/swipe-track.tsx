'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * A swipe deck under `sm`, the plain stack it already was above it.
 *
 * Built on native scroll snap rather than a pointer-drag loop like components/analysis-sphere.tsx.
 * The sphere needs one because nothing in the platform rotates a sphere; a horizontal deck is a
 * scroll container, and taking it over by hand would mean reimplementing momentum, the trackpad, the
 * scrollbar, Tab, and the screen reader's own "next item" -- all of which are free here.
 *
 * The dots read position from an IntersectionObserver instead of counting drag deltas, so they stay
 * right no matter what moved the track: a flick, a keypress, an arrow button, or the browser scrolling
 * a focused card into view.
 */
export function SwipeTrack({
  label,
  copy,
  children
}: {
  label: string
  copy: { previous: string; next: string; goTo: string }
  children: ReactNode[]
}) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const items = [...track.children]
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(items.indexOf(entry.target))
        }
      },
      // Half the card visible is the one being looked at. A lower ratio makes two dots light at once
      // mid-scroll; a higher one leaves none lit while the snap settles.
      { root: track, threshold: 0.5 }
    )

    for (const item of items) observer.observe(item)
    return () => observer.disconnect()
  }, [])

  const scrollTo = useCallback((index: number) => {
    const track = trackRef.current
    if (!track) return

    const target = track.children[index]
    if (!(target instanceof HTMLElement)) return

    // Jump rather than glide when the reader asked for less motion, matching the keyframe rules in
    // app/globals.css. The card still arrives; only the travel between is dropped.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    track.scrollTo({
      left: target.offsetLeft - track.offsetLeft,
      behavior: reduced ? 'auto' : 'smooth'
    })
  }, [])

  const count = children.length

  return (
    <div className="space-y-4">
      <ul
        ref={trackRef}
        aria-label={label}
        className={cn(
          'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2',
          // The scrollbar is noise under three cards that already have dots. Hidden visually only:
          // the container still scrolls, so nothing about the interaction changes.
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // Above sm it stops being a deck and goes back to being the list it was.
          'sm:block sm:snap-none sm:space-y-4 sm:overflow-visible sm:pb-0'
        )}
      >
        {children.map((child, i) => (
          <li key={i} className="w-full shrink-0 snap-center sm:w-auto sm:shrink">
            {child}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-4 sm:hidden">
        <div className="flex items-center gap-2">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={copy.goTo.replace('{index}', String(i + 1))}
              aria-current={i === active || undefined}
              className={cn(
                'h-2 w-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                i === active ? 'bg-foreground' : 'bg-border'
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollTo(Math.max(0, active - 1))}
            disabled={active === 0}
          >
            {copy.previous}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollTo(Math.min(count - 1, active + 1))}
            disabled={active === count - 1}
          >
            {copy.next}
          </Button>
        </div>
      </div>
    </div>
  )
}
