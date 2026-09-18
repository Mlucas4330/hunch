import { ANCHOR_SETTLE_FALLBACK_MS, DISCLOSURE_DURATION_PROPERTY, REVEAL_FLASH_CLASS } from '@/lib/constants'

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
 * **Opening takes time, and scrolling before it finishes lands in the wrong place.** The cards animate
 * their height over `--disclosure-duration`, so an immediate `scrollIntoView` measures a card that is
 * still a bar and leaves the reader above, or short of, the thing they clicked. The wait is read off
 * that same custom property, so the stylesheet stays the one place the number lives.
 *
 * `highlight` is the element that should say "here it is" once the scroll lands, for a link that
 * points into a card rather than at it: the marker on the screenshot sends the reader to a card, and
 * what they are actually looking for is one quoted line inside it.
 *
 * `prefers-reduced-motion` is checked here rather than left to the stylesheet: the `scroll-behavior`
 * override in app/globals.css governs CSS-driven scrolling, and `scrollIntoView` takes its own
 * `behavior` argument that ignores it entirely. The flash is disabled there by the stylesheet.
 */
export function revealAnchor(id: string, highlight?: string): boolean {
  const target = document.getElementById(id)
  if (!target) return false

  let opened = false
  let node: HTMLElement | null = target
  while (node) {
    const details: HTMLDetailsElement | null = node.closest('details')
    if (!details) break
    if (!details.open) {
      details.open = true
      opened = true
    }
    node = details.parentElement
  }

  const land = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    flash(highlight ? document.getElementById(highlight) : target)
  }

  if (opened) setTimeout(land, disclosureDuration())
  else land()

  return true
}

/**
 * A tinted plate on what the reader was sent to, gone a moment later.
 *
 * Removed on `animationend` rather than on a timer, so the stylesheet owns how long it lasts. Adding
 * the class twice in a row needs the first one gone first, otherwise the second click does nothing
 * visible.
 */
function flash(element: HTMLElement | null): void {
  if (!element) return

  element.classList.remove(REVEAL_FLASH_CLASS)
  // Reading a layout property is what makes the removal take effect before the class is added back.
  void element.offsetWidth
  element.classList.add(REVEAL_FLASH_CLASS)
  element.addEventListener('animationend', () => element.classList.remove(REVEAL_FLASH_CLASS), {
    once: true
  })
}

/**
 * How long the cards take to open, in milliseconds, from the stylesheet.
 *
 * A property that is missing, or in a unit this does not expect, falls back rather than throwing: a
 * scroll that happens too early is a worse landing, not a broken page.
 */
function disclosureDuration(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(DISCLOSURE_DURATION_PROPERTY)
    .trim()

  if (raw.endsWith('ms')) return Number.parseFloat(raw) || ANCHOR_SETTLE_FALLBACK_MS
  if (raw.endsWith('s')) return (Number.parseFloat(raw) || 0) * 1000 || ANCHOR_SETTLE_FALLBACK_MS

  return ANCHOR_SETTLE_FALLBACK_MS
}
