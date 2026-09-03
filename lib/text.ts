import { VARIANT_WORD_BUDGET_FLOOR, VARIANT_WORD_BUDGET_RATIO } from '@/lib/constants'

export function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length
}

/**
 * The words in a string, lowercased, with punctuation and emoji dropped.
 *
 * **Deliberately not shared with `words()` in lib/keywords.ts**, which looks almost identical and
 * answers a different question. That one drops anything shorter than two characters because a term
 * extractor has no use for them; this one keeps every word, because it is used to decide whether a
 * rewrite added anything at all and "it only added one short word" is a distinction that has to
 * survive rather than be filtered away.
 */
export function tokens(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
}

export function variantWordBudget(words: number): number {
  return Math.max(words + VARIANT_WORD_BUDGET_FLOOR, Math.ceil(words * VARIANT_WORD_BUDGET_RATIO))
}

// The stand-in for a `PageElement.capacity` nobody could measure: the fixtures run with no browser,
// and `generateAlternateVariants` is handed a stored string rather than a live element. Real
// capacity comes off the page in `captureElements` and is always preferred where it exists.
export function variantCharBudget(text: string): number {
  return Math.ceil(text.length * VARIANT_WORD_BUDGET_RATIO)
}
