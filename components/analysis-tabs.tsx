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
