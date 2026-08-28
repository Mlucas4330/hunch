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
        className="flex flex-wrap gap-2"
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
            // **Every tab draws its own box, selected or not.** This used to be an underline rail:
            // one `border-b-2` that was `border-transparent` while inactive, so three of the four
            // targets had no edge at all and the row read as a strip of words with one of them
            // coloured. A reader could not see where a target began or ended until they hovered it.
            // A full border on every tab is what makes the set read as a set, and the fill plus the
            // accent border is what says which one is open.
            className={cn(
              'flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === active
                ? 'border-purple bg-purple/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground'
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

          {/* **The panel gets a wrapper so it is an only child, and that is a key warning rather
              than a layout choice.** A panel is built by the page that owns the tabs and handed over
              as a prop, so React never saw it created inside an array and never marked it validated.
              Dropped straight in beside the heading it becomes the second entry of a children array
              with no key of its own, and reconciliation warns -- naming this component, because this
              is where the array is, and naming the page, because that is where the element came
              from. As an only child it is not an array member at all. */}
          <div className="space-y-6">{panels[tab]}</div>
        </div>
      ))}
    </div>
  )
}
