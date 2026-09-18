'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ANALYSIS_WAIT_MAX_MS, JOB_POLL_INTERVAL_MS } from '@/lib/constants'
import type { AnalysisState, RunStep } from '@/lib/enums'

/**
 * What `GET /api/analyses?embedKey=` answers with. The waiting screen draws the second half; the
 * first half is what decides whether to stop polling.
 */
export type AnalysisPoll = {
  state: AnalysisState
  measured: boolean
  generated: boolean
  url: string
  screenshotUrl: string | null
  score: number | null
  crawledPages: number | null
  steps: RunStep[]
}

export type PollResult = { stalled: boolean; progress: AnalysisPoll | null }

/**
 * **Polls the progress endpoint while the analysis is in `waiting`, and refreshes the route exactly
 * once when it leaves it.** Returns the last answer and whether the wait ran past the deadline.
 *
 * `GET /api/analyses?embedKey=` answers the question off a few columns, needs no session, and is the
 * endpoint the URL form already polls. `setInterval(router.refresh)` instead would re-run the whole
 * report render every two seconds.
 *
 * **It also stops.** The deadline is the same wall clock the form waits on, so a job nothing ever
 * finishes swaps the note rather than being polled until the component unmounts.
 *
 * **The answer is kept even after the last tick**, because the screen drawn from it is the one on
 * screen while the route refreshes.
 */
export function useAnalysisPoll(embedKey: string, waiting: AnalysisState): PollResult {
  const router = useRouter()
  const [stalled, setStalled] = useState(false)
  const [progress, setProgress] = useState<AnalysisPoll | null>(null)

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

        const answer: AnalysisPoll = await res.json()
        if (cancelled) return

        setProgress(answer)
        if (answer.state === waiting) return

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

  return { stalled, progress }
}
