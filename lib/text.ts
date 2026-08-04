import { VARIANT_WORD_BUDGET_FLOOR, VARIANT_WORD_BUDGET_RATIO } from '@/lib/constants'

export function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length
}

// The most words a variant may use to replace copy of this length. Handed to the model per element
// rather than described in prose, because "match the element's length" is a measurement the prompt
// was only ever approximating -- which is how a six word hero headline came back as a paragraph.
export function variantWordBudget(words: number): number {
  return Math.max(words + VARIANT_WORD_BUDGET_FLOOR, Math.ceil(words * VARIANT_WORD_BUDGET_RATIO))
}
