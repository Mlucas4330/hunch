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
  // **The domain is its own element, not a token inside the sentence.** Interpolated, the whole line
  // was one run of text in a chip narrow enough that `truncate` ate the end of it -- and the end is
  // where the score lives. Split, the domain gets the emphasis it deserves and the sentence gets its
  // own line to wrap onto.
  //
  // A row with no score reads as running whatever its state says, and every part of the toast has to
  // agree on that: the sentence, the dot and the rule down the side are one claim shown three ways.
  const status = entry.score === null ? copy.running : t(copy.done, { score: entry.score })
  const running = entry.state === 'running' || entry.score === null

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
      className={cn(
        // **A bar on a phone, a chip on a desktop.** Pinning only `left` gave it the width of its
        // content, which on a 375px screen is a box with no room for the sentence inside it. Pinning
        // both edges below `sm` lets it use the screen; above `sm` it goes back to sitting in the
        // corner out of the way.
        'animate-fade-up fixed bottom-4 left-4 right-4 z-40 flex items-start gap-3 overflow-hidden rounded-lg border bg-card py-2.5 pl-4 pr-2 shadow-lg',
        'sm:right-auto sm:max-w-sm'
      )}
    >
      {/* The state, as a rule down the edge. **An element rather than `border-l-4` plus a colour
          class**: `cn` runs tailwind-merge, which reads `border-l-4` and `border-l-green` as one
          group and drops one of them -- the toast rendered a four pixel rule in the default grey. A
          child cannot be merged away, and it keeps the card's own border on all four sides. */}
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          running ? 'bg-purple' : 'bg-green'
        )}
        aria-hidden
      />

      <span className="relative mt-1.5 flex size-2 shrink-0" aria-hidden>
        {/* The running state is the one worth catching an eye: it says the tool is working on
            somebody's page at this moment. A measured one has already happened and sits still. */}
        {running && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-purple opacity-70" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2 rounded-full',
            running ? 'bg-purple' : 'bg-green'
          )}
        />
      </span>

      {/* `min-w-0` so the domain's truncation happens inside this column rather than pushing the
          close button off the edge. The domain is the one thing allowed to truncate: it is a
          hostname, and its start identifies it. */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm font-medium">{entry.domain}</p>
        <p className="text-xs text-muted-foreground">{status}</p>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label={copy.dismiss}
        className="-m-1 shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>,
    document.body
  )
}
