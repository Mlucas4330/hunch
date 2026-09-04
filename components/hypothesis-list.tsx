'use client'

import { useMemo, useState } from 'react'
import { HypothesisCard } from '@/components/hypothesis-card'
import { CardDrawers } from '@/components/card-drawers'
import { FixVerdict } from '@/components/fix-verdict'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RankedListHeader } from '@/components/ranked-list-header'
import { VariantPreview } from '@/components/variant-preview'
import { HYPOTHESIS_EXPANDED_COUNT } from '@/lib/constants'
import { useI18n } from '@/components/i18n-provider'
import type { Hypothesis, Variant } from '@/db/schema'
import { hasPlaceholders } from '@/lib/utils'
import { roundsLeft } from '@/lib/variant-rounds'
import { VARIANT_TONE, type VariantTone } from '@/lib/enums'
import { variantWordBudget, wordCount } from '@/lib/text'
import { t } from '@/lib/i18n/format'

// Stands in for a variant id while the owner's own line is saving, since it has none yet.
const OWN_LINE = 'own'

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

  // Impact, and nothing else. Floating the auto targets up because they are the ones with a preview
  // would quietly hand "Start here" to a lesser idea for being easier to photograph. That label
  // means the idea worth the most, and whether a change can be previewed is not a reason to make it
  // first.
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

  const [choosing, setChoosing] = useState<string | null>(null)
  const [draft, setDraft] = useState<string | null>(null)

  // **Position 0 is the chosen line, everywhere.** The card renders it, the screenshot route
  // photographs it and the harness scores against it, so choosing is reordering and no second column
  // exists to disagree. See app/api/hypotheses/[id]/variants/route.ts.
  const recommended = variants[0]
  const alternates = variants.slice(1)

  // Optimism would be wrong here, unlike on the verdict: this reorders the list under the reader's
  // finger, so a swap that bounced back would look like the button moved the wrong row.
  async function choose(variantId: string) {
    setChoosing(variantId)
    try {
      const res = await fetch(`/api/hypotheses/${hypothesis.id}/variants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId })
      })
      const data = res.ok ? await res.json() : null
      if (data?.variants?.length) setVariants(data.variants)
    } catch {
      // Same fail-quiet as the generation below: the list is still usable and the reader can retry.
    } finally {
      setChoosing(null)
    }
  }

  // The owner's own line. It goes to the same route as a choice because it answers the same
  // question -- which line is going to be used -- and it lands as a new row rather than an edit, so
  // what the model wrote stays beside what the reader published.
  async function saveDraft() {
    const copy = draft?.trim()
    if (!copy) return

    setChoosing(OWN_LINE)
    try {
      const res = await fetch(`/api/hypotheses/${hypothesis.id}/variants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy })
      })
      const data = res.ok ? await res.json() : null
      if (data?.variants?.length) {
        setVariants(data.variants)
        setDraft(null)
      }
    } catch {
      // Fail-quiet, like the two beside it. The text is still in the box and can be sent again.
    } finally {
      setChoosing(null)
    }
  }

  // The same sum the route does, from the same function: two copies would disagree the first time
  // either was touched, and the reader would be offered a round the route refuses.
  const rounds = roundsLeft(variants)

  // Fail-quiet by design: the recommendation is already usable, so a failed generation leaves the
  // card exactly as it was rather than showing the reader an error they cannot act on. The drawer
  // says so in one line, because a drawer that opens onto nothing is worse than one that explains.
  //
  // **A second round is not a second draw from the same distribution**: the route hands the model
  // everything already written, and a direction narrows what it may vary. See docs/ai-pipeline.md.
  async function writeMore(tone: VariantTone | null) {
    if (pending || rounds === 0) return
    setPending(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/hypotheses/${hypothesis.id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tone ? { tone } : {})
      })
      const data = res.ok ? await res.json() : null
      if (data?.variants?.length) setVariants(data.variants)
      else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  function loadAlternates() {
    if (alternates.length > 0) return
    void writeMore(null)
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

          {/* **The line is theirs to change, and the card says whose words are on screen.** An
              owner's line is the one thing on this report that nobody here wrote, so it is marked
              rather than left to read as generated. */}
          {isOwner &&
            (draft === null ? (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDraft(recommended.copy)}
                  className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  {copy.editThis}
                </button>
                {recommended.author === 'owner' && (
                  <span className="panel-label text-nano text-muted-foreground">
                    {copy.yourWords}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-1" data-testid="variant-editor">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  aria-label={copy.editThis}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {/* The ceiling warns and never refuses: it is the reader's own page, and the best
                    rewrite anybody wrote all day went over this one. */}
                {wordCount(draft) > variantWordBudget(wordCount(hypothesis.currentCopy)) && (
                  <p className="text-xs text-amber">
                    {t(copy.overBudget, {
                      words: wordCount(draft),
                      budget: variantWordBudget(wordCount(hypothesis.currentCopy))
                    })}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={choosing !== null || draft.trim().length === 0}
                    onClick={saveDraft}
                  >
                    {choosing === OWN_LINE ? copy.choosing : copy.saveEdit}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={choosing !== null}
                    onClick={() => setDraft(null)}
                  >
                    {dictionary.common.cancel}
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

      <CardDrawers
        drawers={[
          {
            id: 'why',
            label: dictionary.report.whyThisWorks,
            content: (
              <>
                {/* The verdict first, because it is what answers "why are you touching this line at
                    all". Null on every hypothesis written before the field existed, and then the
                    drawer is exactly what it always was rather than a label over nothing. */}
                {hypothesis.assessment && (
                  <p>
                    <span className="panel-label text-nano text-purple-soft">
                      {copy.assessmentLabel}
                    </span>{' '}
                    {hypothesis.assessment}
                  </p>
                )}
                <p>{hypothesis.rationale}</p>
                {/* Two different things, marked apart on purpose: `rationale` argues why the
                    replacement is better, `evidence` names the CRO mechanism it uses. Unprefixed
                    they read as one undifferentiated paragraph. */}
                {recommended?.evidence && (
                  <p>
                    <span className="panel-label text-nano text-purple-soft">
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
                  key={recommended?.id}
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
                  <div
                    key={variant.id}
                    data-testid="alternate-variant"
                    className="space-y-2 rounded-md border border-border p-3"
                  >
                    <p className="text-sm font-medium leading-snug text-foreground">{variant.copy}</p>
                    {variant.evidence && (
                      <p className="text-xs text-muted-foreground">{variant.evidence}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={choosing !== null}
                      onClick={() => choose(variant.id)}
                    >
                      {choosing === variant.id ? copy.choosing : copy.useThis}
                    </Button>
                  </div>
                ))}
                {/* Shaped like the row it will become, rather than a spinner: the drawer is about to
                    hold two of these and a line of text would make the panel jump when they land. */}
                {pending &&
                  [0, 1].map((row) => (
                    <div key={row} className="space-y-2 rounded-md border border-border p-3">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                      <Skeleton className="h-9 w-28" />
                    </div>
                  ))}
                {failed && !pending && alternates.length === 0 && (
                  <p className="text-muted-foreground">{copy.optionsUnavailable}</p>
                )}

                {/* **The direction is a closed list because it reaches a prompt.** A free field would
                    let somebody ask for a claim the product cannot make, and the only defence would
                    be a written rule. See lib/enums.ts. */}
                {alternates.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="panel-label text-nano text-muted-foreground">
                      {rounds > 0 ? t(copy.roundsLeft, { rounds }) : copy.roundsSpent}
                    </p>
                    {rounds > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {VARIANT_TONE.map((tone) => (
                          <Button
                            key={tone}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending || choosing !== null}
                            onClick={() => writeMore(tone)}
                          >
                            {copy.tones[tone]}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null
          }
        ]}
      />

      {/* Under the drawers, because it is what the reader does after reading, and owner only for
          the same reason the alternates are. */}
      {isOwner && (
        <FixVerdict target="hypothesis" id={hypothesis.id} initial={hypothesis.verdict} />
      )}
    </>
  )
}
