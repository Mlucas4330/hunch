'use client'

import type { ReactNode } from 'react'
import { PenLine, Search, Sparkles, Workflow, type LucideIcon } from 'lucide-react'
import { PanelCard } from '@/components/panel-card'
import { useI18n } from '@/components/i18n-provider'
import { ANALYSIS_TAB, type AnalysisTab } from '@/lib/enums'
import { cn } from '@/lib/utils'

const ANALYSIS_SECTION_ICON: Record<AnalysisTab, LucideIcon> = {
  flow: Workflow,
  copy: PenLine,
  seo: Search,
  ai: Sparkles
}

/**
 * The four fix lists, stacked, each one a `PanelCard`.
 *
 * **These were tabs, and they had been through three shapes before this one.** An underline rail
 * where three of the four targets had no edge at all; then a bordered box each, which read as four
 * separate components floating on the page's background; then one `Card` wrapping the row and the
 * panel, which fixed the floating and left the report with two different container idioms on one
 * screen -- the readout's collapsing group cards above, and a tab strip below them.
 *
 * They are the same idiom now, and the reader gains something the tab version could never give them:
 * **more than one open at a time.** A tab is a claim that these are alternative views of one thing;
 * they are not, they are four lists of work, and somebody deciding what to ship this week wants to
 * see the structural fixes and the copy at once.
 *
 * The first non-empty section opens and the rest start closed. All four open is up to twenty fix
 * cards and eight hypotheses at once, which is a page nobody reads the start of; all four closed
 * gives a reader who paid four black bars and nothing they bought.
 *
 * `ANALYSIS_TAB` keeps its name: it is the order and the dictionary key, and the values are the same
 * four things they always were.
 */
export function AnalysisSections({
  panels,
  counts,
  className
}: {
  panels: Record<AnalysisTab, ReactNode>
  counts: Record<AnalysisTab, number>
  className?: string
}) {
  const { dictionary } = useI18n()
  const available = ANALYSIS_TAB.filter((tab) => counts[tab] > 0)

  if (available.length === 0) return null

  return (
    <div className={cn('space-y-4', className)} data-testid="analysis-sections">
      {available.map((tab, index) => (
        <PanelCard
          key={tab}
          id={tab}
          icon={ANALYSIS_SECTION_ICON[tab]}
          label={dictionary.analysis.sections[tab]}
          defaultOpen={index === 0}
          testId={`analysis-section-${tab}`}
          trailing={
            <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
              {counts[tab]}
            </span>
          }
        >
          <div className="space-y-6 p-4 sm:p-6">
            {/* The bar carries the short technical term because it shares a line with the count; the
                direct question lives here, where there is width for it. It frames the section and
                never asserts. See docs/analysis-ui.md. */}
            <h2 className="text-balance font-display text-xl font-bold tracking-tight">
              {dictionary.analysis.sectionQuestions[tab]}
            </h2>

            {/* **The panel gets a wrapper so it is an only child, and that is a key warning rather
                than a layout choice.** A panel is built by the page that owns these sections and
                handed over as a prop, so React never saw it created inside an array and never marked
                it validated. Dropped straight in beside the heading it becomes the second entry of a
                children array with no key of its own, and reconciliation warns -- naming this
                component, because this is where the array is, and naming the page, because that is
                where the element came from. As an only child it is not an array member at all. */}
            <div className="space-y-6">{panels[tab]}</div>
          </div>
        </PanelCard>
      ))}
    </div>
  )
}
