/**
 * Scroll to a section or a card, opening whatever is closed in front of it.
 *
 * **A plain `href="#id"` is not enough on this page, and that is not a detail.** Almost everything
 * worth linking to in the report lives inside a `<details>` -- a fix card inside an `AnalysisSections`
 * panel is two deep -- and a closed `<details>` gives its content no box. So the browser scrolls to
 * an element with no height and the reader arrives at a collapsed bar with no idea which of the
 * things on screen they were sent to. Chrome has started auto-expanding `details` for hidden anchor
 * targets; most browsers have not, and a cross-reference that works in one of them is worse than one
 * that works nowhere, because nobody finds the bug.
 *
 * So every ancestor is opened first, then the scroll happens against the layout that results.
 *
 * `prefers-reduced-motion` is checked here rather than left to the stylesheet: the `scroll-behavior`
 * override in app/globals.css governs CSS-driven scrolling, and `scrollIntoView` takes its own
 * `behavior` argument that ignores it entirely.
 */
export function revealAnchor(id: string): boolean {
  const target = document.getElementById(id)
  if (!target) return false

  let node: HTMLElement | null = target
  while (node) {
    const details: HTMLDetailsElement | null = node.closest('details')
    if (!details) break
    details.open = true
    node = details.parentElement
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })

  return true
}
