'use client'

import { useEffect } from 'react'
import { REVEAL_ROOT_MARGIN, REVEAL_READY_ATTR, REVEALED_ATTR } from '@/lib/constants'

/**
 * Reveals every `.reveal` element as it scrolls into view.
 *
 * One observer for the whole page rather than a wrapper component per element: the elements are
 * server rendered and the class is the entire API, so a section gains the effect by gaining a class
 * and this file never has to know about it.
 *
 * Elements are unobserved once revealed. The effect is one way on purpose -- scrolling back up must
 * not re-hide text somebody is reading.
 *
 * Nodes added after mount are not picked up. Everything carrying the class today is in the server
 * rendered HTML, and watching the tree for more would cost a `MutationObserver` on every page to
 * catch a case that does not exist yet.
 */
export function ScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(`.reveal:not([${REVEALED_ATTR}])`)
    if (targets.length === 0) return

    // Absent when the inline script skipped it for reduced motion, in which case nothing should move.
    if (!document.documentElement.hasAttribute(REVEAL_READY_ATTR)) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute(REVEALED_ATTR, '')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: REVEAL_ROOT_MARGIN }
    )

    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  return null
}
