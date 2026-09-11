'use client'

import type { ReactNode } from 'react'
import { ANALYSIS_SECTION_ICON } from '@/components/analysis-section-icon'
import { PanelCard } from '@/components/panel-card'
import { useI18n } from '@/components/i18n-provider'
import type { AnalysisTab } from '@/lib/enums'
import { cn } from '@/lib/utils'

/**
 * The report's sections, stacked, each one a `PanelCard`: what was measured on the theme, then the
 * errors written from it. The first one opens and the rest start closed. See docs/analysis-ui.md.
 *
 * `counts` is null while nothing has been generated, because a zero on the bar would read as a clean
 * section.
 */
export function AnalysisSections({
  sections,
  counts,
  evidence,
  panels,
  className
}: {
  sections: AnalysisTab[]
  counts: Record<AnalysisTab, number> | null
  evidence: Record<AnalysisTab, ReactNode>
  panels: Record<AnalysisTab, ReactNode>
  className?: string
}) {
  const { dictionary } = useI18n()

  if (sections.length === 0) return null

  return (
    <div className={cn('space-y-4', className)} data-testid="analysis-sections">
      {sections.map((tab, index) => (
        <PanelCard
          key={tab}
          id={tab}
          icon={ANALYSIS_SECTION_ICON[tab]}
          label={dictionary.analysis.sections[tab]}
          defaultOpen={index === 0}
          testId={`analysis-section-${tab}`}
          trailing={
            counts && (
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                {counts[tab]}
              </span>
            )
          }
        >
          <div className="space-y-6 p-4 sm:p-6">
            <h2 className="text-balance font-display text-xl font-bold tracking-tight">
              {dictionary.analysis.sectionQuestions[tab]}
            </h2>

            {/* Each slot is built by the page and handed over as a prop, so it gets a wrapper of its
                own: beside the heading it would be a keyless array member and React warns. */}
            {evidence[tab] && <div>{evidence[tab]}</div>}
            {panels[tab] && <div className="space-y-6">{panels[tab]}</div>}
          </div>
        </PanelCard>
      ))}
    </div>
  )
}
