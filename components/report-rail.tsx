'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { RAIL_ACTIVE_MARGIN } from '@/lib/constants'
import type { ReportSection } from '@/lib/enums'
import { cn } from '@/lib/utils'

/**
 * Where the reader is in the report, and how to get anywhere else in it.
 *
 * A fully generated report is roughly fifteen sections and something near a hundred discrete numbers
 * on one scrolling page. Until this existed there was no table of contents, no progress, and no way
 * back up: the reader's only model of the document was however far they had scrolled. This is the
 * cheapest fix for that -- it adds no information, it just says what is already there and where.
 *
 * **The section list is a prop, built by the page from the same conditions that decide what renders.**
 * Not derived here, and never the whole of REPORT_SECTION: a rail offering "Copy" on a report with no
 * hypotheses is a link to nothing, which is worse than no rail. See app/(report)/r/[embedKey]/page.tsx.
 *
 * **On the `IntersectionObserver`, and why this is not the one docs/components.md removed.** That one
 * was a scroll reveal: it started elements hidden and showed them on intersection, so the half that
 * hid and the half that revealed had different lifetimes and content could be left invisible. This
 * observer *hides nothing*. Every target is mounted and painted whether it runs or not; all it does
 * is read which one is in view. If it never runs, the rail is still a list of working anchors -- the
 * degraded state is "nothing is highlighted", not "the report is blank". Do not remove this by
 * analogy with that one.
 *
 * **The marker is one element that slides, and it is CSS.** It was briefly a `layoutId` shared
 * element from the animation library, on the reasoning that two positions in a list are two different
 * DOM nodes and therefore beyond CSS. That reasoning was wrong here: the rows are a fixed height by
 * construction (`--rail-row`), so the marker's position is arithmetic on the active index and a
 * `transform` transition covers it exactly. Layout animations also need the library's `domMax` bundle
 * rather than `domAnimation`, which measured 42kB gzipped for this one effect -- on a product whose
 * argument is that the reader's page is too heavy. See docs/components.md.
 *
 * Not rendered below `lg`. A horizontal strip on a phone would be a second sticky bar under the
 * navbar, competing with it for the top of a screen that has less of it to spare.
 */
export function ReportRail({ sections }: { sections: ReportSection[] }) {
  const { dictionary } = useI18n()
  const [active, setActive] = useState<ReportSection | null>(sections[0] ?? null)

  useEffect(() => {
    const targets = sections
      .map((section) => document.getElementById(section))
      .filter((node): node is HTMLElement => node !== null)

    if (targets.length === 0) return

    // Every entry is re-evaluated on each callback rather than trusting the one that fired: with a
    // top-biased root margin several sections can be intersecting at once, and the answer the reader
    // expects is the highest one on the page, not the most recent one to cross.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.id)

        if (visible.length === 0) return

        const first = sections.find((section) => visible.includes(section))
        if (first) setActive(first)
      },
      { rootMargin: RAIL_ACTIVE_MARGIN, threshold: 0 }
    )

    for (const target of targets) observer.observe(target)
    return () => observer.disconnect()
  }, [sections])

  if (sections.length < 2) return null

  const activeIndex = active ? sections.indexOf(active) : -1

  return (
    <nav
      aria-label={dictionary.report.rail.label}
      className="sticky top-24 hidden self-start lg:block print:hidden"
      data-testid="report-rail"
    >
      <p className="panel-label mb-3 text-nano text-muted-foreground">
        {dictionary.report.rail.label}
      </p>

      <ul className="relative" style={{ '--active': Math.max(activeIndex, 0) } as CSSProperties}>
        {/* Hidden until something is active, so a rail that never resolves a section does not park a
            marker on the first row and assert the reader is there. */}
        <span
          aria-hidden
          className={cn(
            'absolute left-0 top-0 w-0.5 rounded-full bg-foreground transition-transform duration-300 ease-out motion-reduce:transition-none',
            activeIndex < 0 && 'opacity-0'
          )}
          style={{
            height: 'var(--rail-row)',
            transform: 'translateY(calc(var(--active) * var(--rail-row)))'
          }}
        />
        {sections.map((section) => {
          const current = section === active

          return (
            <li key={section}>
              <a
                href={`#${section}`}
                aria-current={current ? 'true' : undefined}
                className={cn(
                  'panel-label flex items-center rounded-sm pl-3 text-nano transition-colors',
                  // The fixed row height is what makes the marker's position arithmetic rather than
                  // a measurement. Changing it means changing --rail-row in app/globals.css.
                  'h-(--rail-row)',
                  current ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {labelFor(section, dictionary)}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

type ReportDictionary = ReturnType<typeof useI18n>['dictionary']

/**
 * The four analysis sections take their names from `analysis.sections`, where they already live and
 * where the panel bars read them from. Writing a second set under `report.rail` would be the same
 * four words twice, free to drift into two names for one section.
 */
function labelFor(section: ReportSection, dictionary: ReportDictionary): string {
  if (section === 'start' || section === 'readout' || section === 'terms') {
    return dictionary.report.rail.sections[section]
  }

  return dictionary.analysis.sections[section]
}
