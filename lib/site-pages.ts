import { NEIGHBOUR_PAGE_PATTERNS, SITE_PAGE_MAX } from '@/lib/constants'
import type { PageLink } from '@/lib/scrape'

/**
 * Which of a page's own links are worth opening, and nothing about opening them.
 *
 * **The landing page is not where a business says what it does.** The price is on the pricing page,
 * the mechanism is in the docs, the customer is on the about page, and the copy generator has never
 * seen any of it -- so it rewrote lines using the only vocabulary in front of it, which was the
 * vocabulary of the line it was replacing. Measuring two neighbours is the same move the brief made,
 * with this code doing the finding instead of the reader doing the typing. See docs/ai-pipeline.md.
 *
 * **It selects; it never crawls.** A link matching no pattern is never opened, so an analysis visits
 * at most `SITE_PAGE_MAX` recognised kinds of page and never walks a site. Nothing here follows a
 * link found on a page it opened.
 *
 * **Every import from lib/scrape.ts is type-only**, for the reason lib/competitor.ts spells out.
 */

export interface NeighbourPage {
  /** Which `NEIGHBOUR_PAGE_PATTERNS` entry matched. One page of each kind at most. */
  id: string
  url: string
}

function pathOf(href: string): string {
  try {
    return new URL(href).pathname.replace(/\/+$/, '') || '/'
  } catch {
    return ''
  }
}

/**
 * Ranked by the pattern list's own order, one page per kind, capped at `SITE_PAGE_MAX`.
 *
 * The anchor text is tried before the path because it is what a human wrote about the destination; a
 * path can be `/p/12`. Both are tried, since plenty of navs are icons.
 */
export function pickNeighbours(links: PageLink[], pageUrl: string): NeighbourPage[] {
  const self = pathOf(pageUrl)
  const chosen: NeighbourPage[] = []
  const takenPaths = new Set([self])

  for (const { id, pattern } of NEIGHBOUR_PAGE_PATTERNS) {
    if (chosen.length >= SITE_PAGE_MAX) break

    const match = links.find((link) => {
      const path = pathOf(link.href)
      // The page linking to itself is the commonest match of all: a logo, a nav item marked current,
      // a "back to home". Opening it would spend a browser slot re-reading what was just measured.
      if (!path || takenPaths.has(path)) return false
      return pattern.test(link.text) || pattern.test(path)
    })

    if (!match) continue

    takenPaths.add(pathOf(match.href))
    chosen.push({ id, url: match.href })
  }

  return chosen
}
