import { TARGET_MATCH_MAX_WORD_RATIO } from '@/lib/constants'
import type { HypothesisTarget } from '@/lib/enums'
import type { PageElement } from '@/lib/scrape'
import { wordCount } from '@/lib/text'

/**
 * The element list leaves through `promptElements` and comes back through `resolveTarget`, which is
 * why both live here. **Every import from lib/scrape.ts is type-only**, for the reason lib/competitor.ts
 * spells out: a value import pulls puppeteer in, and these have to stay callable from a test and from
 * anywhere else that has no browser.
 */

export const MAX_PROMPT_ELEMENTS = 150

// Tags that get a place in the prompt before the quota is spent on body copy: the page's headings,
// and the controls a visitor clicks.
const PRIORITY_ELEMENT_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button'])

/**
 * The elements the copy prompt may write a variant for, chosen by what they are rather than by where
 * they sit in the document.
 *
 * `captureElements` walks `document.querySelectorAll('*')`, so it returns in document order, and the
 * cut used to be a plain `.slice` off the front. On a long page that meant the last hundred elements
 * were unreachable: there was no possible variant for the closing call to action, because it was
 * element number four hundred. Headings and clickable controls now claim their places first and body
 * copy fills what is left.
 *
 * **The result is re-sorted back into document order.** The model reasons about a page as a sequence,
 * and handing it the buttons first and the paragraphs after would describe a page that does not
 * exist. Priority decides what survives the cut, never what order it is read in.
 */
export function promptElements(elements: PageElement[]): PageElement[] {
  const indexed = elements.map((element, index) => ({ element, index }))
  const priority = indexed.filter(({ element }) => PRIORITY_ELEMENT_TAGS.has(element.tag))
  const rest = indexed.filter(({ element }) => !PRIORITY_ELEMENT_TAGS.has(element.tag))

  return [...priority, ...rest]
    .slice(0, MAX_PROMPT_ELEMENTS)
    .sort((a, b) => a.index - b.index)
    .map(({ element }) => element)
}

export interface ResolvedTarget {
  selector: string | null
  mode: HypothesisTarget
  text: string | null
  /**
   * Whether the quoted line was located on the page at all.
   *
   * **`mode` cannot carry this and that is the bug it fixes.** `manual` means "we cannot point a
   * selector at it", which is true of a line appearing twice, of an ambiguous near match, and of a
   * line that is simply not on the page. The first two are real quotes of the reader's own page; the
   * third is a sentence a model wrote, and it was being rendered struck through as what their page
   * says today. See docs/ai-pipeline.md.
   */
  found: boolean
  /**
   * The matched element's measured box width in characters, or null when nothing was pointed at.
   *
   * **The ceiling that decides whether the reader can actually use the line**, unlike
   * `variantWordBudget`, which is a heuristic over the original's length. Copy past this one is cut
   * off by the site's own CSS. Nothing stores it, so it exists only while a generation is in flight.
   */
  capacity: number | null
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Maps a quoted line back to the element it came from.
 *
 * **Containment decides `found`; the word ratio only decides whether a selector can be pointed at.**
 * Those are two different questions and conflating them is a trap, because the ratio was tuned for
 * the second one -- its constant warns that being wrong means snapping a long merged string onto a
 * tiny element. Applied to the first it would call a four word quote of a six word heading "not on
 * this page", which is false, and now that a missing quote deletes the card it would delete a real
 * one.
 *
 * So a quote that is a substring of an element, or contains one, is on the page. Whether the two are
 * close enough in length to swap safely is asked afterwards, and failing it gives `manual`: the line
 * exists, and pointing at it would be a guess.
 */
export function resolveTarget(currentCopy: string, elements: PageElement[]): ResolvedTarget {
  const absent: ResolvedTarget = { selector: null, mode: 'manual', text: null, found: false, capacity: null }
  const ambiguous: ResolvedTarget = { selector: null, mode: 'manual', text: null, found: true, capacity: null }

  const target = normalize(currentCopy)
  if (!target) return absent

  const exact = elements.filter((e) => normalize(e.text) === target)
  if (exact.length === 1) {
    return { selector: exact[0].selector, mode: 'auto', text: exact[0].text, found: true, capacity: exact[0].capacity }
  }
  if (exact.length > 1) return ambiguous

  const targetWords = wordCount(target)
  const overlapping = elements
    .map((el) => ({ el, norm: normalize(el.text) }))
    .filter(({ norm }) => norm.includes(target) || target.includes(norm))

  if (overlapping.length === 0) return absent

  const near = overlapping
    .map(({ el, norm }) => {
      const words = wordCount(norm)
      const ratio = Math.max(words, targetWords) / Math.max(1, Math.min(words, targetWords))
      return { el, ratio }
    })
    .filter(({ ratio }) => ratio <= TARGET_MATCH_MAX_WORD_RATIO)
    .sort((a, b) => a.ratio - b.ratio)

  if (near.length === 0) return ambiguous
  if (near.length > 1 && near[0].ratio === near[1].ratio) return ambiguous
  return { selector: near[0].el.selector, mode: 'auto', text: near[0].el.text, found: true, capacity: near[0].el.capacity }
}
