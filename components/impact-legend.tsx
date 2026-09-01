'use client'

import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'

/**
 * What the number down the left edge of every ranked card means, said once per list.
 *
 * **It is here rather than in the card**, for two reasons. `InfoHint` is a button, and a button
 * inside a `<summary>` is an interactive element nested in an interactive element -- the click
 * would toggle the card. And the answer is the same for all six rows, so asking it six times is six
 * controls carrying one sentence.
 *
 * The sentence itself is bounded by [invariants.md](../docs/invariants.md): the score ranks the
 * fixes against each other, it was written by a model rather than counted, and it never says what
 * the change will produce.
 */
export function ImpactLegend() {
  const { dictionary } = useI18n()

  return (
    <div className="flex items-center gap-1.5">
      <span className="panel-label text-nano text-muted-foreground">
        {dictionary.score.impact}
      </span>
      <InfoHint label={dictionary.score.hintLabel}>
        <RichText>{dictionary.score.hint}</RichText>
      </InfoHint>
    </div>
  )
}
