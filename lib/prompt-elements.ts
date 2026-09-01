import type { PageElement } from '@/lib/scrape'

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
