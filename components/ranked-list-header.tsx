'use client'

import { ImpactLegend } from '@/components/impact-legend'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'

/**
 * The header over a ranked list: eyebrow, title, the section's own hint, and the impact legend.
 *
 * **One component because there are two lists and they had already drifted once.** `FlowPlaybook`
 * built this markup inline for its three sections and `HypothesisList` had nothing at all, so the
 * copy section was the only one of the four opening straight onto cards. Written twice it would drift
 * again the first time either was touched -- which is the failure this whole surface was merged to
 * stop, one level down.
 *
 * It sits **below** the section's question (`analysis.sectionQuestions`, rendered by
 * `AnalysisSections`). The question frames the section; this names the list and states what was
 * checked.
 */
export function RankedListHeader({
  eyebrow,
  title,
  hintLabel,
  hint
}: {
  eyebrow: string
  title: string
  hintLabel: string
  hint: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{eyebrow}</p>
        <div className="flex items-center gap-2">
          <h2 className="text-balance font-display text-xl font-bold tracking-tight">{title}</h2>
          <span className="print:hidden">
            <InfoHint label={hintLabel}>
              <RichText>{hint}</RichText>
            </InfoHint>
          </span>
        </div>
      </div>
      <ImpactLegend />
    </div>
  )
}
