'use client'

import { Tags } from 'lucide-react'
import { AdIdeas } from '@/components/ad-ideas'
import { KeywordTable } from '@/components/keyword-table'
import { PanelCard } from '@/components/panel-card'
import { useI18n } from '@/components/i18n-provider'
import type { AdIdeas as AdIdeasOutput } from '@/lib/ai/schema'
import type { PageKeywords } from '@/lib/keywords'

/**
 * The page's own words, and what can be bought with them.
 *
 * The table counts the terms the page repeats and marks which of its own surfaces already carry
 * each one. That is the only kind of keyword data this product can honestly produce: we have no
 * index and no clickstream, so volume and difficulty would be invented at the moment they were
 * printed. See docs/invariants.md.
 *
 * It is its own `PanelCard` at the end of the document, under a heading that says what to take from
 * it, with the ad groups written off those same terms underneath, so the count leads somewhere
 * instead of being a table the reader interprets alone.
 *
 * **It starts closed, like the sections above it.** Open it costs a ten by six table and up to four
 * ad groups, each line carrying its own character counter, at the foot of a document that already
 * asks a lot: the single largest thing on the page, shown to every reader whether or not they came
 * for it. The rail names it, so a reader who wants it can reach it in one click from anywhere.
 */
export function PageTerms({
  keywords,
  analysisId,
  isOwner,
  adIdeas,
  className
}: {
  keywords: PageKeywords | null
  analysisId: string
  isOwner: boolean
  adIdeas: AdIdeasOutput | null
  className?: string
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.readout.keywords

  if (!keywords?.terms.length) return null

  return (
    <PanelCard
      id="terms"
      icon={Tags}
      label={copy.eyebrow}
      testId="page-terms"
      className={className}
    >
      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-2">
          {/* `keywords.hint` is the limit sentence and `KeywordTable` already renders it under the
              table, where the columns it qualifies are. It is deliberately not repeated here. */}
          <h2 className="text-balance font-display text-xl font-bold tracking-tight">
            {copy.heading}
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{copy.explain}</p>
        </div>

        <KeywordTable keywords={keywords} />

        <AdIdeas analysisId={analysisId} isOwner={isOwner} ideas={adIdeas} />
      </div>
    </PanelCard>
  )
}
