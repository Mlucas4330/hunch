'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ANALYSIS_WAIT_MAX_MS, JOB_POLL_INTERVAL_MS } from '@/lib/constants'
import { ANALYSIS_TAB, type AnalysisState } from '@/lib/enums'

type Progress = { state: AnalysisState }

/**
 * What stands where the four fix sections will be, while they are still being written.
 *
 * **This is the wait, and it happens on the report rather than on the form.** The reader arrives
 * here as soon as the page has been measured, with their score above this block, and these are the
 * four things still coming: named, so a half filled report reads as deliberate rather than as one
 * that failed to load.
 *
 * The sections come from ANALYSIS_TAB in its own order, so this cannot fall out of step with what
 * AnalysisSections renders when the generation lands.
 */
export function GeneratingSections({ embedKey }: { embedKey: string }) {
  const { dictionary } = useI18n()
  const router = useRouter()
  const copy = dictionary.report.generating
  const [stalled, setStalled] = useState(false)

  /**
   * **Polls the progress endpoint, and refreshes the route exactly once.**
   *
   * `GET /api/analyses?embedKey=` answers the question off three columns, needs no session, and is
   * the endpoint the URL form already polls. One `router.refresh()` happens when there is something
   * new to render.
   *
   * `setInterval(router.refresh)` instead re-runs the whole server component every two seconds:
   * `loadReport` with its joins, the current user, the readout history, and a Redis read. That is a
   * heavy render to ask for two hundred times, and the worse cost is that the state is recomputed
   * from a transient signal on every pass, so a momentary Redis blip drops the page to the unlock
   * wall and the next pass brings this back, flickering between "still writing" and "buy a credit".
   *
   * **It also stops.** The deadline is the same wall clock the form waits on, so a job nothing ever
   * finishes swaps the note rather than being polled until the component unmounts.
   */
  useEffect(() => {
    let cancelled = false
    const deadline = Date.now() + ANALYSIS_WAIT_MAX_MS

    const timer = setInterval(async () => {
      if (Date.now() > deadline) {
        setStalled(true)
        clearInterval(timer)
        return
      }

      try {
        const res = await fetch(`/api/analyses?embedKey=${embedKey}`)
        if (!res.ok) return

        const { state }: Progress = await res.json()
        if (cancelled || state === 'generating') return

        // Anything else is terminal for this component: the fixes landed, or the generation failed
        // and the credit went back. Both are rendered by the server, so one refresh replaces this.
        clearInterval(timer)
        router.refresh()
      } catch {
        // A dropped poll is not a verdict -- the worker still holds the job. Try again next tick.
      }
    }, JOB_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [embedKey, router])

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

      <p className="text-sm text-muted-foreground">{stalled ? copy.stalled : copy.note}</p>
    </div>
  )
}
