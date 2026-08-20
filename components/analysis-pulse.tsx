'use client'

import { useEffect, useState } from 'react'
import { AnalysisPulseToast } from '@/components/analysis-pulse-toast'
import { AnalysisSphere } from '@/components/analysis-sphere'
import { useI18n } from '@/components/i18n-provider'
import { PULSE_POLL_INTERVAL_MS, PULSE_TOP_COUNT } from '@/lib/constants'
import type { PublicScore, PulseEntry } from '@/lib/analyses'

type Pulse = { leaderboard: PublicScore[]; pulse: PulseEntry[] }

/**
 * The live half of the landing page: the sphere, the ranked list beside it, and the toast.
 *
 * One component and one timer for all three, because they read the same answer and two timers would
 * poll the same route twice. The server renders the first frame from its own query, so the board is
 * in the HTML and the poll only ever replaces it.
 *
 * The interval is slow on purpose — nobody is waiting on this the way they wait on an analysis they
 * started, and the route it hits is cached per PULSE_CACHE_SECONDS anyway.
 */
export function AnalysisPulse({ initial }: { initial: Pulse }) {
  const { dictionary } = useI18n()
  const copy = dictionary.landing
  const [data, setData] = useState<Pulse>(initial)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let controller: AbortController | null = null
    let stopped = false

    async function poll() {
      if (document.hidden) return schedule()

      controller = new AbortController()
      try {
        const res = await fetch('/api/pulse', { signal: controller.signal })
        if (res.ok && !stopped) setData((await res.json()) as Pulse)
      } catch {
        // A failed poll leaves the last answer on screen. There is nothing to report to a reader who
        // never asked for this in the first place.
      }
      schedule()
    }

    function schedule() {
      if (stopped) return
      timer = setTimeout(poll, PULSE_POLL_INTERVAL_MS)
    }

    schedule()

    return () => {
      stopped = true
      clearTimeout(timer)
      controller?.abort()
    }
  }, [])

  const top = data.leaderboard.slice(0, PULSE_TOP_COUNT)

  return (
    <>
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_16rem]">
        <AnalysisSphere entries={data.leaderboard} label={copy.leaderboard.sphereLabel} />

        <div className="space-y-3">
          <p className="panel-label text-[0.7rem] text-muted-foreground">
            {copy.leaderboard.topLabel}
          </p>
          <ol className="space-y-3">
            {top.map((entry, i) => (
              <li key={entry.domain} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="panel-label text-[0.7rem] text-muted-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate font-mono text-xs">{entry.domain}</span>
                  </span>
                  <span className="font-display text-sm font-semibold tabular-nums">
                    {entry.score}
                    <span className="text-muted-foreground">{copy.leaderboard.outOf}</span>
                  </span>
                </div>
                <div className="h-px bg-border" />
              </li>
            ))}
          </ol>
        </div>
      </div>

      <AnalysisPulseToast entries={data.pulse} copy={copy.pulse} />
    </>
  )
}
