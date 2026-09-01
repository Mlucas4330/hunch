'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { JOB_POLL_INTERVAL_MS } from '@/lib/constants'
import { ANALYSIS_TAB } from '@/lib/enums'

/**
 * What stands where the four fix sections will be, while they are still being written.
 *
 * **This is the wait, moved off the form and into the report.** It used to be a spinner on the
 * landing page in front of an empty screen, driven by three `setTimeout` calls that announced
 * "writing the new copy" at forty six seconds whatever was actually happening. The reader now
 * arrives here as soon as the page has been measured, with their score above this block, and these
 * are the four things still coming -- named, so a half filled report reads as deliberate rather than
 * as one that failed to load.
 *
 * The sections are named from ANALYSIS_TAB in its own order, so this cannot fall out of step with
 * what AnalysisSections renders when the generation lands.
 *
 * `router.refresh()` re-runs the server component, which is what swaps this for the real thing. It
 * polls at JOB_POLL_INTERVAL_MS, the same beat the form used, and stops itself on unmount -- the
 * refresh that finally finds hypotheses renders a tree without this component in it.
 */
export function GeneratingSections() {
  const { dictionary } = useI18n()
  const router = useRouter()
  const copy = dictionary.report.generating

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), JOB_POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="space-y-4" role="status" aria-busy data-testid="generating-sections">
      <p className="panel-label text-micro text-muted-foreground">{copy.eyebrow}</p>

      {ANALYSIS_TAB.map((tab) => (
        <Card key={tab}>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-base font-semibold tracking-tight">
                {dictionary.analysis.sections[tab]}
              </span>
              {/* Skeleton already carries `animate-shimmer`, and app/globals.css turns that off
                  under prefers-reduced-motion along with every other animation in the app. It is the
                  only moving part here: no spinner of its own. */}
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      ))}

      <p className="text-sm text-muted-foreground">{copy.note}</p>
    </div>
  )
}
