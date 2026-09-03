import { hasPlaceholders } from '@/lib/utils'
import { tokens, variantWordBudget, wordCount } from '@/lib/text'

/**
 * What a replacement line does to the line it replaces, measured rather than judged.
 *
 * **This exists because "the copy is bad" was only ever an opinion about somebody's landing page.**
 * Whose opinion counts there is the page's owner, so it is useless for deciding whether a change to
 * the generator helped. These properties are about the generator: they hold across pages, need no
 * model, and cost nothing to compute.
 *
 * None of them says a rewrite is good. `permutation` says one cannot possibly be, which is a much
 * weaker and much more defensible claim -- see the field.
 */
export type RewriteStats = {
  /** Words in the replacement. */
  words: number
  /** Words in the replacement that do not appear in the line it replaces. */
  newWords: number
  /** Share of the replacement's words the original already carried, 0 to 1. */
  reuseRatio: number
  /**
   * The replacement adds no word the original did not already have.
   *
   * **The strongest claim that survives with 32 samples.** A text whose words are a subset of the
   * original's proposes no idea by construction, whatever order they are in, so there is no page and
   * no taste on which it could be an improvement. Two real rewrites are exactly this: one reordered
   * three security badges, another swapped two sentences.
   *
   * High reuse short of that is **not** the same claim. A quarter of real rewrites reuse 70% or more
   * and most of them are legitimate -- a rewrite keeps the product's own nouns. Do not turn this into
   * a ratio threshold without the evidence to place it.
   */
  permutation: boolean
  /** The replacement carries a `[bracket]` the founder has to fill in. */
  hasPlaceholder: boolean
  /**
   * Past the word ceiling the element's own length implies.
   *
   * The heuristic ceiling, not the measured one: `PageElement.capacity` is the width of the real box
   * and is never stored, so it cannot be computed from a row after the fact. See docs/ai-pipeline.md.
   */
  overWordBudget: boolean
}

export function rewriteStats(currentCopy: string, variantCopy: string): RewriteStats {
  const original = new Set(tokens(currentCopy))
  const rewritten = tokens(variantCopy)
  const newWords = rewritten.filter((word) => !original.has(word)).length

  return {
    words: rewritten.length,
    newWords,
    // An empty replacement reuses nothing rather than everything: there is no text to have reused it.
    reuseRatio: rewritten.length === 0 ? 0 : (rewritten.length - newWords) / rewritten.length,
    permutation: rewritten.length > 0 && newWords === 0,
    hasPlaceholder: hasPlaceholders(variantCopy),
    overWordBudget: wordCount(variantCopy) > variantWordBudget(wordCount(currentCopy))
  }
}

/** Phrases that state what generally works, in a field that may only argue from this page. */
const UNMEASURED_CLAIM =
  /convert[ea]m? melhor|converts better|funciona quando|works when|em qualquer landing|on any landing|elemento de maior impacto|highest impact element|costuma[m]? |tende[m]? a |geralmente|na maioria|usually|tend to /i

/**
 * Whether a `rationale` argues from what generally works rather than from this page.
 *
 * A heuristic and openly incomplete: it recognises the phrasings that actually turned up, so it
 * measures a floor and never a total. It is here to show a rate moving between runs, not to gate
 * anything -- nothing is rejected on this.
 */
export function claimsGeneralTruth(rationale: string): boolean {
  return UNMEASURED_CLAIM.test(rationale)
}
