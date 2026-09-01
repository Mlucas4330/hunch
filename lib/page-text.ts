import { PROMPT_SECTIONS_KEEP_TAIL, PROMPT_TEXT_MAX_CHARS } from '@/lib/constants'
import type { PageSection } from '@/lib/scrape'

/**
 * The page's text, cut to fit a prompt, plus an honest account of what was cut.
 *
 * **The account is the point.** Truncation on its own turns "you were not shown this" into "the page
 * does not have this", and a model handed the top third of a page will state that the pricing is
 * missing, that there is no FAQ, that nothing says what the product costs. Our own report did exactly
 * that about our own page. That is the same error docs/invariants.md forbids when robots.txt cannot
 * be read: unknown is never reported as negative. A `.slice` is not exempt from it.
 *
 * Two strategies, in order of how much they preserve:
 *
 * - **Sections.** Drop from the MIDDLE, keeping the opening and the last PROMPT_SECTIONS_KEEP_TAIL,
 *   and name every dropped block by its heading. A landing page argues at the top and closes at the
 *   bottom; the middle is where the repetition lives.
 * - **Flat text**, when a row was measured before sections existed. Cut the tail, because there is
 *   nothing structured to be cleverer with, and say so.
 *
 * Under budget, `omitted` is empty and no note is produced. Saying "you received everything" on a
 * page that fits would be noise, and a note that appears every time is a note nobody reads.
 */
export type ComposedPageText = {
  text: string
  /** Headings of the sections left out, in document order. Empty when nothing was. */
  omitted: string[]
  /** True when text was cut at all, including the flat fallback where nothing can be named. */
  truncated: boolean
}

export function composePageText(input: {
  sections?: PageSection[]
  fallback: string
  budget?: number
}): ComposedPageText {
  const budget = input.budget ?? PROMPT_TEXT_MAX_CHARS
  const sections = input.sections ?? []

  if (sections.length === 0) {
    const text = input.fallback.slice(0, budget)
    return { text, omitted: [], truncated: text.length < input.fallback.length }
  }

  const joined = sections.map(render).join('\n\n')
  if (joined.length <= budget) return { text: joined, omitted: [], truncated: false }

  // Walk outwards from both ends so the opening and the closing survive together. Dropping strictly
  // from the middle means the two halves shrink at the same rate rather than the tail being spent
  // first, which is what a plain slice does and what this exists to stop.
  const kept = new Set<number>()
  let used = 0

  const order = priority(sections.length)
  for (const index of order) {
    const cost = render(sections[index]).length + 2
    if (used + cost > budget) continue
    kept.add(index)
    used += cost
  }

  // A single section longer than the whole budget keeps nothing, and an empty prompt is worse than a
  // cut one. Fall back to the plain slice, which is what a page of one enormous block deserves.
  if (kept.size === 0) {
    return { text: joined.slice(0, budget), omitted: [], truncated: true }
  }

  const text = sections
    .map((section, index) => (kept.has(index) ? render(section) : null))
    .filter((value): value is string => value !== null)
    .join('\n\n')

  const omitted = sections
    .map((section, index) => (kept.has(index) ? null : (section.heading ?? UNTITLED)))
    .filter((value): value is string => value !== null)

  return { text, omitted, truncated: omitted.length > 0 }
}

/**
 * The line a prompt carries when something was left out, and nothing when everything fit.
 *
 * It names what is missing and then says what the model may conclude from that, because the first
 * half alone does not stop the failure -- a model told "some sections were omitted" still writes
 * "the page never states its price". The instruction is the half that binds.
 */
export function coverageNote(composed: ComposedPageText): string {
  if (!composed.truncated) return ''

  const what = composed.omitted.length
    ? `These sections of the page were left out of the text above: ${composed.omitted.join('; ')}.`
    : 'The text above is the beginning of the page and was cut short.'

  return `\n\nCoverage: ${what} You were not shown all of this page. Never state that the page lacks something you were not shown, and never describe what the omitted parts do or do not contain.`
}

const UNTITLED = '(untitled section)'

function render(section: PageSection): string {
  return section.heading ? `## ${section.heading}\n${section.text}` : section.text
}

/**
 * The order sections are admitted in: the opening, then the closing blocks, then the middle.
 *
 * The tail is claimed before any of the middle on purpose. The last PROMPT_SECTIONS_KEEP_TAIL
 * sections are pricing, FAQ and the closing call to action on nearly every landing page, and to a
 * conversion audit they are worth more than another band of features halfway down.
 */
function priority(length: number): number[] {
  const tailStart = Math.max(1, length - PROMPT_SECTIONS_KEEP_TAIL)
  const range = (from: number, to: number) =>
    Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i)

  return [0, ...range(tailStart, length), ...range(1, tailStart)]
}
