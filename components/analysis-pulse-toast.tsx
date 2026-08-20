'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  PULSE_TOAST_DISMISSED_KEY,
  PULSE_TOAST_GAP_MS,
  PULSE_TOAST_VISIBLE_MS
} from '@/lib/constants'
import { t } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'
import type { PulseEntry } from '@/lib/analyses'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

/**
 * One line at a time about what the tool is doing, bottom left of the landing page.
 *
 * Every line is a row that exists: `running` is an analysis with no measurement on it yet, `done` is
 * one that has a score. **Nothing here may say what the score means or what fixing it would do** —
 * that is the same rule the readout is held to, and a corner toast is exactly where it would be
 * easiest to break. See docs/invariants.md.
 *
 * Closing it silences the toast for the tab. `sessionStorage` and not a cookie: the reader wanted it
 * gone now, not a preference recorded against them.
 */
export function AnalysisPulseToast({
  entries,
  copy
}: {
  entries: PulseEntry[]
  copy: Dictionary['landing']['pulse']
}) {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(false)
  const [silenced, setSilenced] = useState(true)

  useEffect(() => {
    setSilenced(window.sessionStorage.getItem(PULSE_TOAST_DISMISSED_KEY) === '1')
  }, [])

  useEffect(() => {
    if (silenced || entries.length === 0) return

    let timer: ReturnType<typeof setTimeout>

    function cycle(show: boolean) {
      setShown(show)
      if (!show) setIndex((current) => current + 1)
      timer = setTimeout(() => cycle(!show), show ? PULSE_TOAST_VISIBLE_MS : PULSE_TOAST_GAP_MS)
    }

    timer = setTimeout(() => cycle(true), PULSE_TOAST_GAP_MS)

    return () => clearTimeout(timer)
  }, [silenced, entries.length])

  if (silenced || entries.length === 0 || !shown) return null

  const entry = entries[index % entries.length]
  const line =
    entry.state === 'running' || entry.score === null
      ? t(copy.running, { domain: entry.domain })
      : t(copy.done, { domain: entry.domain, score: entry.score })

  function dismiss() {
    window.sessionStorage.setItem(PULSE_TOAST_DISMISSED_KEY, '1')
    setSilenced(true)
  }

  // Portalled to the body, and it has to be. `position: fixed` is relative to the viewport only while
  // no ancestor has a transform, and the landing page's own wrapper carries `animate-fade-up` — whose
  // `both` fill mode leaves a transform on the element forever. That makes the wrapper the containing
  // block, and the toast anchors to the bottom of the page instead of the bottom of the screen.
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      data-testid="pulse-toast"
      className="animate-fade-up fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm"
    >
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          entry.state === 'running' ? 'bg-purple' : 'bg-green'
        )}
        aria-hidden
      />
      <p className="truncate text-sm">{line}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={copy.dismiss}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>,
    document.body
  )
}
