'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ANALYSIS_TAB, type AnalysisTab } from '@/lib/enums'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

// The four sections of an analysis, as tabs. One shell for both surfaces that show them: the owner's
// analysis screen and the public report. The print report deliberately does not use it -- nothing may
// be hidden behind a tab on paper.
//
// Panels arrive already rendered, as ReactNode, so a server component can hand server-rendered
// children to this client shell and the public report stays server-rendered inside it.
//
// Every panel stays mounted and the inactive ones are `hidden`, rather than only rendering the
// active one. Switching tabs must not remount HypothesisList (which would refetch /api/experiments)
// or a VariantPreview that has already rendered a screenshot.
export function AnalysisTabs({
  panels,
  counts,
  className
}: {
  panels: Record<AnalysisTab, ReactNode>
  counts: Record<AnalysisTab, number>
  className?: string
}) {
  const { dictionary } = useI18n()
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // An empty tab is not rendered at all: the fix components return null for an empty list, so a tab
  // bar built from the enum alone would offer a tab that opens onto nothing. This is the normal case
  // for analyses generated before the visibility audit existed -- their rows are all `flow`, so SEO
  // and AI are genuinely empty rather than broken.
  const available = useMemo(
    () => ANALYSIS_TAB.filter((tab) => counts[tab] > 0),
    [counts]
  )

  const [selected, setSelected] = useState<AnalysisTab>(available[0] ?? ANALYSIS_TAB[0])
  const active = available.includes(selected) ? selected : (available[0] ?? ANALYSIS_TAB[0])

  if (available.length === 0) return null

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return

    event.preventDefault()
    const next = available[(index + delta + available.length) % available.length]
    setSelected(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div
        role="tablist"
        aria-label={dictionary.analysis.title}
        className="flex flex-wrap gap-1 border-b"
      >
        {available.map((tab, index) => (
          <button
            key={tab}
            ref={(node) => {
              tabRefs.current[tab] = node
            }}
            type="button"
            role="tab"
            id={`tab-${tab}`}
            aria-selected={tab === active}
            aria-controls={`panel-${tab}`}
            tabIndex={tab === active ? 0 : -1}
            onClick={() => setSelected(tab)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === active
                ? 'border-purple text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {dictionary.analysis.tabs[tab]}
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {available.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          hidden={tab !== active}
          className="space-y-6"
        >
          {panels[tab]}
        </div>
      ))}
    </div>
  )
}
