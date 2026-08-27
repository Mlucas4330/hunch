'use client'

import { useMemo, useState } from 'react'
import { HypothesisCard } from '@/components/hypothesis-card'
import { CardDrawers } from '@/components/card-drawers'
import { RankedListHeader } from '@/components/ranked-list-header'
import { VariantPreview } from '@/components/variant-preview'
import { HYPOTHESIS_EXPANDED_COUNT } from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import type { Hypothesis, Variant } from '@/db/schema'
import { hasPlaceholders } from '@/lib/utils'

export type HypothesisWithVariants = Hypothesis & { variants: Variant[] }

/**
 * The copy ideas, on the one analysis surface there is.
 *
 * **`embedKey` is here so the owner can see the preview too.** The preview route authenticates on
 * the embed key rather than on a session, so the key is what has to be passed down.
 *
 * **`isOwner` gates the alternates and nothing else.** Writing two more variants is a model call
 * behind an authenticated route, so offering the button to a reader who was handed the link would
 * be offering a button that answers 401. Everything else on the card is the same document for
 * everyone, which is the point of there being one route -- see docs/report.md.
 */
export function HypothesisList({
  hypotheses,
  embedKey,
  isOwner
}: {
  hypotheses: HypothesisWithVariants[]
  embedKey: string
  isOwner: boolean
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.hypothesisList

  // Impact, and nothing else. The public report used to float the auto targets to the top because
  // they are the ones with a preview -- but "Start here" is the first row, and it means the idea
  // worth the most, so a second sort key quietly hands that label to a lesser idea for being
  // easier to photograph. Whether a change can be previewed is not a reason to make it first.
  const ranked = useMemo(
    () => [...hypotheses].sort((a, b) => b.impactScore - a.impactScore),
    [hypotheses]
  )

  return (
    <div className="space-y-3">
      <RankedListHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        hintLabel={copy.hintLabel}
        hint={copy.hint}
      />
      {ranked.map((hypothesis, index) => (
        <HypothesisCard
          key={hypothesis.id}
          hypothesis={hypothesis}
          isTop={index === 0}
          defaultOpen={index < HYPOTHESIS_EXPANDED_COUNT}
          showManualBadge
        >
          <HypothesisBody hypothesis={hypothesis} embedKey={embedKey} isOwner={isOwner} />
        </HypothesisCard>
      ))}
    </div>
  )
}

function HypothesisBody({
  hypothesis,
  embedKey,
  isOwner
}: {
  hypothesis: HypothesisWithVariants
  embedKey: string
  isOwner: boolean
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.hypothesisList
  const [variants, setVariants] = useState(hypothesis.variants)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const recommended = variants[0]
  const alternates = variants.slice(1)

  // Fail-quiet by design: the recommendation is already usable, so a failed generation leaves the
  // card exactly as it was rather than showing the reader an error they cannot act on. The drawer
  // says so in one line, because a drawer that opens onto nothing is worse than one that explains.
  async function loadAlternates() {
    if (alternates.length > 0) return
    setPending(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/hypotheses/${hypothesis.id}/variants`, { method: 'POST' })
      const data = res.ok ? await res.json() : null
      if (data?.variants?.length) setVariants(data.variants)
      else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      {recommended && (
        <div className="space-y-2">
          {/* No labels above these two lines. The strikethrough is the label -- it is the diff
              convention every reader already has, and four panel-labels stacked above the one
              sentence that matters was the whole reason the card read as a wall. The names survive
              for a screen reader, where there is no strikethrough to carry the distinction. */}
          <p className="text-sm text-muted-foreground line-through">
            <span className="sr-only">{dictionary.report.current}: </span>
            {hypothesis.currentCopy}
          </p>
          <p className="text-base font-medium leading-snug">
            <span className="sr-only">{dictionary.report.changeTo}: </span>
            {recommended.copy}
          </p>
          {hasPlaceholders(recommended.copy) && (
            <p className="font-mono text-xs text-amber">{copy.placeholderWarning}</p>
          )}
          {hypothesis.target !== 'auto' && (
            <p className="text-xs text-muted-foreground">{dictionary.report.manualSetupBody}</p>
          )}
        </div>
      )}

      <CardDrawers
        drawers={[
          {
            id: 'why',
            label: dictionary.report.whyThisWorks,
            content: (
              <>
                <p>{hypothesis.rationale}</p>
                {/* Two different things, marked apart on purpose: `rationale` argues why the
                    challenger wins, `evidence` names the CRO mechanism it uses. Unprefixed they
                    read as one undifferentiated paragraph. */}
                {recommended?.evidence && (
                  <p>
                    <span className="panel-label text-[0.6rem] text-purple-soft">
                      {copy.evidenceMechanism}
                    </span>{' '}
                    {recommended.evidence}
                  </p>
                )}
              </>
            )
          },
          {
            id: 'preview',
            label: copy.previewLabel,
            // Only for an auto target. A manual one has no selector to swap, so there is nothing to
            // photograph -- the line under the copy already says so.
            content:
              hypothesis.target === 'auto' ? (
                <VariantPreview
                  embedKey={embedKey}
                  hypothesisId={hypothesis.id}
                  initialUrl={recommended?.screenshotUrl ?? null}
                  initialBeforeUrl={recommended?.screenshotBeforeUrl ?? null}
                  initialOverflow={recommended?.screenshotOverflow ?? false}
                />
              ) : null
          },
          {
            id: 'alternates',
            label: copy.otherOptions,
            testId: 'load-alternates',
            onOpen: loadAlternates,
            content: isOwner ? (
              <div className="space-y-2" data-testid="alternate-variants">
                {alternates.map((variant) => (
                  <p key={variant.id}>{variant.copy}</p>
                ))}
                {pending && <p className="text-muted-foreground">{copy.writingOptions}</p>}
                {failed && !pending && alternates.length === 0 && (
                  <p className="text-muted-foreground">{copy.optionsUnavailable}</p>
                )}
              </div>
            ) : null
          }
        ]}
      />
    </>
  )
}
