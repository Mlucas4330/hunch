'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { HypothesisCard } from '@/components/hypothesis-card'
import { VariantPreview } from '@/components/variant-preview'
import { WhyBlock } from '@/components/why-block'
import { HYPOTHESIS_EXPANDED_COUNT } from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import type { Hypothesis, Variant } from '@/db/schema'
import { hasPlaceholders } from '@/lib/utils'

export type HypothesisWithVariants = Hypothesis & { variants: Variant[] }

/**
 * The copy ideas on the owner's own screen.
 *
 * **`embedKey` is here so the owner can see the preview too.** This list rendered no preview at all
 * while `/r/<embedKey>` did, which put the before/after picture in front of everyone the reader
 * shared the link with and nowhere in front of the reader who paid for it. The preview route
 * authenticates on the embed key rather than on a session, so the key is what has to be passed down.
 */
export function HypothesisList({
  hypotheses,
  embedKey
}: {
  hypotheses: HypothesisWithVariants[]
  embedKey: string
}) {
  const ranked = useMemo(
    () => [...hypotheses].sort((a, b) => b.impactScore - a.impactScore),
    [hypotheses]
  )

  return (
    <div className="space-y-3">
      {ranked.map((hypothesis, index) => (
        <HypothesisRow
          key={hypothesis.id}
          hypothesis={hypothesis}
          embedKey={embedKey}
          rank={index + 1}
          isTop={index === 0}
          defaultOpen={index < HYPOTHESIS_EXPANDED_COUNT}
        />
      ))}
    </div>
  )
}

function HypothesisRow({
  hypothesis,
  embedKey,
  rank,
  isTop,
  defaultOpen
}: {
  hypothesis: HypothesisWithVariants
  embedKey: string
  rank: number
  isTop: boolean
  defaultOpen: boolean
}) {
  return (
    <HypothesisCard
      hypothesis={hypothesis}
      rank={rank}
      isTop={isTop}
      defaultOpen={defaultOpen}
      showManualBadge
    >
      <HypothesisBody hypothesis={hypothesis} embedKey={embedKey} />
    </HypothesisCard>
  )
}

function HypothesisBody({
  hypothesis,
  embedKey
}: {
  hypothesis: HypothesisWithVariants
  embedKey: string
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.hypothesisList
  const [variants, setVariants] = useState(hypothesis.variants)
  const [pending, setPending] = useState(false)
  const [asked, setAsked] = useState(false)

  const recommended = variants[0]
  const alternates = variants.slice(1)

  // Fail-quiet by design: the recommendation is already usable, so a failed generation leaves the
  // card exactly as it was rather than showing the reader an error they cannot act on.
  async function loadAlternates() {
    setAsked(true)
    setPending(true)
    try {
      const res = await fetch(`/api/hypotheses/${hypothesis.id}/variants`, { method: 'POST' })
      const data = res.ok ? await res.json() : null
      if (data?.variants?.length) setVariants(data.variants)
    } catch {
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      {recommended && (
        <div className="space-y-3 rounded-md bg-muted p-3">
          <div className="space-y-1">
            <p className="panel-label text-[0.6rem] text-muted-foreground">
              {dictionary.report.current}
            </p>
            <p className="text-sm text-muted-foreground line-through">{hypothesis.currentCopy}</p>
          </div>
          <div className="space-y-1">
            <p className="panel-label text-[0.6rem] text-muted-foreground">
              {copy.recommendedChallenger}
            </p>
            <p className="text-sm">{recommended.copy}</p>
          </div>
          {hasPlaceholders(recommended.copy) && (
            <p className="text-xs text-amber">{copy.placeholderWarning}</p>
          )}

          {alternates.length > 0 ? (
            <div className="space-y-2 border-t pt-3" data-testid="alternate-variants">
              <p className="panel-label text-[0.6rem] text-muted-foreground">{copy.otherOptions}</p>
              {alternates.map((variant) => (
                <p key={variant.id} className="text-sm">
                  {variant.copy}
                </p>
              ))}
            </div>
          ) : (
            !asked && (
              <Button
                size="sm"
                variant="outline"
                onClick={loadAlternates}
                disabled={pending}
                data-testid="load-alternates"
              >
                {pending ? copy.writingOptions : copy.otherOptions}
              </Button>
            )
          )}
        </div>
      )}

      {/* Only for an auto target. A manual one has no selector to swap, so there is nothing to
          photograph -- the card already carries the manual badge that says so. */}
      {hypothesis.target === 'auto' && (
        <VariantPreview
          embedKey={embedKey}
          hypothesisId={hypothesis.id}
          initialUrl={recommended?.screenshotUrl ?? null}
          initialBeforeUrl={recommended?.screenshotBeforeUrl ?? null}
          initialOverflow={recommended?.screenshotOverflow ?? false}
        />
      )}

      <WhyBlock label={dictionary.report.whyThisWorks}>
        <p>{hypothesis.rationale}</p>
        {recommended?.evidence && (
          <p>
            <span className="panel-label text-[0.6rem] text-purple-soft">{copy.evidenceMechanism}</span>{' '}
            {recommended.evidence}
          </p>
        )}
      </WhyBlock>
    </>
  )
}
