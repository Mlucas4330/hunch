import { ALTERNATES_PER_ROUND, VARIANT_ROUNDS_MAX } from '@/lib/constants'

/**
 * How many more times the reader may ask for lines on one hypothesis.
 *
 * **Counted over the model's own rows.** Writing your own line is not asking for another one, so an
 * owner's edits must never spend the allowance. The generation writes one line and each round adds
 * `ALTERNATES_PER_ROUND` more, so the arithmetic is over what is left after that first one.
 *
 * The route and the card both call this, which is the point: two copies of the sum would disagree
 * the first time either was touched, and the reader would be shown a button the route refuses.
 */
export function roundsLeft(variants: { author: string }[]): number {
  const written = variants.filter((variant) => variant.author === 'model').length
  const used = Math.ceil(Math.max(0, written - 1) / ALTERNATES_PER_ROUND)

  return Math.max(0, VARIANT_ROUNDS_MAX - used)
}
