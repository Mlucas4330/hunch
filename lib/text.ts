import { VARIANT_WORD_BUDGET_FLOOR, VARIANT_WORD_BUDGET_RATIO } from '@/lib/constants'

export function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length
}

export function variantWordBudget(words: number): number {
  return Math.max(words + VARIANT_WORD_BUDGET_FLOOR, Math.ceil(words * VARIANT_WORD_BUDGET_RATIO))
}
