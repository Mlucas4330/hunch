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
 * **The table used to be the last thing inside `MeasuredReadout`, and it went nowhere.** It counts
 * the terms the page repeats and marks which of its own surfaces already carry each one, which is a
 * correct measurement and the only kind of keyword data this product can honestly produce -- we have
 * no index and no clickstream, so volume and difficulty would be invented at the moment they were
 * printed. See docs/invariants.md.
 *
 * What it lacked was a destination. It is its own `PanelCard` at the end of the document now, under
 * a heading that says what to take from it, with the ad groups written off those same terms
 * underneath -- so the count leads somewhere instead of being a table the reader interprets alone.
 *
 * It starts open, unlike the four analysis sections above it: it is the last thing on the page, so
 * nothing is buried by it, and a reader who never scrolls this far is not helped by it being closed.
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
      icon={Tags}
      label={copy.eyebrow}
      defaultOpen
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
