'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ANALYSIS_WAIT_MAX_MS, JOB_POLL_INTERVAL_MS } from '@/lib/constants'
import type { AnalysisState } from '@/lib/enums'

/**
 * **Polls the progress endpoint while the analysis is in `waiting`, and refreshes the route exactly
 * once when it leaves it.** Returns whether the wait ran past the deadline.
 *
 * `GET /api/analyses?embedKey=` answers the question off a few columns, needs no session, and is the
 * endpoint the URL form already polls. `setInterval(router.refresh)` instead would re-run the whole
 * report render every two seconds.
 *
 * **It also stops.** The deadline is the same wall clock the form waits on, so a job nothing ever
 * finishes swaps the note rather than being polled until the component unmounts.
 */
export function useAnalysisPoll(embedKey: string, waiting: AnalysisState): boolean {
  const router = useRouter()
  const [stalled, setStalled] = useState(false)

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

        const { state }: { state: AnalysisState } = await res.json()
        if (cancelled || state === waiting) return

        clearInterval(timer)
        router.refresh()
      } catch {
        // A dropped poll is not an answer: the worker still holds the job. Try again next tick.
      }
    }, JOB_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [embedKey, waiting, router])

  return stalled
}
