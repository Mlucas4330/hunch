'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ANONYMOUS_ANALYSES_KEY } from '@/lib/constants'

/**
 * Hands the browser's anonymous analyses to the account that just signed in.
 *
 * Mounted on the dashboard, because that is where a sign-in lands and the only place the result is
 * worth a refresh. It runs client-side by necessity: the keys live in `localStorage`, which is the
 * only thing tying an ownerless analysis to the person who started it.
 *
 * **Fail-quiet on purpose.** A failed claim costs a card in a list, never the analysis: the report
 * is still readable at its own URL. It is not worth an error state on the screen someone just
 * arrived at.
 */
export function ClaimAnalyses() {
  const router = useRouter()
  const done = useRef(false)

  useEffect(() => {
    // Development mounts effects twice; without this the second pass posts the same keys again.
    if (done.current) return
    done.current = true

    let keys: string[] = []
    try {
      keys = JSON.parse(localStorage.getItem(ANONYMOUS_ANALYSES_KEY) ?? '[]')
    } catch {
      return
    }

    if (!Array.isArray(keys) || keys.length === 0) return

    void (async () => {
      try {
        const res = await fetch('/api/analyses/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embedKeys: keys })
        })
        if (!res.ok) return

        const { claimed }: { claimed: number } = await res.json()
        // Cleared whatever the count was: a key that claimed nothing was already someone else's, and
        // keeping it means retrying forever on every visit.
        localStorage.removeItem(ANONYMOUS_ANALYSES_KEY)
        if (claimed > 0) router.refresh()
      } catch {
        // Keys stay put, so the next visit tries again.
      }
    })()
  }, [router])

  return null
}
