'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ANALYSIS_TAB, type AnalysisTab } from '@/lib/enums'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

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
        className="flex flex-wrap gap-x-2 gap-y-1 border-b"
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
            // The hover has to draw the tab's own box, not just recolour its text: with only a colour
            // change the row reads as one strip of words and nothing tells the reader where one target
            // ends and the next begins.
            className={cn(
              '-mb-px flex items-center gap-2 rounded-t-md border-b-2 px-4 py-3 text-sm font-medium transition-colors active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === active
                ? 'border-purple text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {dictionary.analysis.tabs[tab]}
            <span
              className={cn(
                'rounded-sm px-1.5 py-0.5 font-mono text-xs tabular-nums',
                tab === active ? 'bg-purple/15 text-purple' : 'bg-muted text-muted-foreground'
              )}
            >
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
          {/* The tab label is the short technical term because it sits in a wrapping row; the direct
              question lives here, where there is width for it. See docs/analysis-ui.md. */}
          <h2 className="text-balance font-display text-xl font-bold tracking-tight">
            {dictionary.analysis.tabQuestions[tab]}
          </h2>
          {panels[tab]}
        </div>
      ))}
    </div>
  )
}
