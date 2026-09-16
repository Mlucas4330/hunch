'use client'

import { useEffect, useState } from 'react'
import { ANALYSIS_WAIT_MAX_MS, JOB_POLL_INTERVAL_MS } from '@/lib/constants'
import type { BulkBatch } from '@/lib/bulk-batches'

/**
 * Keeps a batch's table current while its runs are still working, and stops once they settle.
 *
 * The same shape as `useAnalysisPoll`, and for the same reason: `router.refresh()` on a timer would
 * re-render the whole page every few seconds to change a few cells. **It also stops** at the same
 * wall clock deadline, so a queue nothing ever drains does not get polled until the tab is closed.
 */
export function useBatchPoll(initial: BulkBatch): BulkBatch {
  const [batch, setBatch] = useState(initial)

  // A server render with newer rows wins: it arrives from a navigation, which is later news than
  // anything this hook has fetched.
  useEffect(() => setBatch(initial), [initial])

  useEffect(() => {
    if (batch.finished) return

    let cancelled = false
    const deadline = Date.now() + ANALYSIS_WAIT_MAX_MS

    const timer = setInterval(async () => {
      if (Date.now() > deadline) {
        clearInterval(timer)
        return
      }

      try {
        const response = await fetch(`/api/analyses/bulk/${batch.id}`)
        if (!response.ok) return

        const next = (await response.json()) as BulkBatch
        if (cancelled) return

        setBatch(next)
        if (next.finished) clearInterval(timer)
      } catch {
        // A dropped poll is not an answer: the runs are still queued. Try again next tick.
      }
    }, JOB_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [batch.id, batch.finished])

  return batch
}
