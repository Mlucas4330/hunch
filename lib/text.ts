import { VARIANT_WORD_BUDGET_FLOOR, VARIANT_WORD_BUDGET_RATIO } from '@/lib/constants'

export function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length
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
