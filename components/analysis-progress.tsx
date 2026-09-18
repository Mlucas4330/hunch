'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'
import { useAnalysisPoll } from '@/components/use-analysis-poll'
import { PROGRESS_TIP_INTERVAL_MS } from '@/lib/constants'
import { RUN_PHASE, type AnalysisState } from '@/lib/enums'
import { t } from '@/lib/i18n/format'
import { phasesFor, type PhaseState } from '@/lib/run-phases'
import { cn } from '@/lib/utils'

/**
 * The screen somebody watches while a run works.
 *
 * A run takes minutes: a browser opens the page, Google scores it, the site is crawled, the index is
 * asked, and three models write. The old wait was a grey bar, which reads as a hang rather than as
 * work. This shows the page itself being read.
 *
 * **Everything on it is something that happened.** The lines tick from the steps the run recorded
 * (lib/run-progress.ts), the picture is the run's own screenshot, and the two numbers are the ones
 * the report will open with. **Nothing here is on a timer**, apart from the clock and the rotating
 * line, which says what the audit covers and never what it found. See docs/report.md.
 *
 * With no Redis there are no steps and the lines advance twice instead of eight times, which is the
 * fallback the phases are built to degrade into rather than a broken screen.
 */
export function AnalysisProgress({
  embedKey,
  url,
  waiting,
  variant = 'page'
}: {
  embedKey: string
  url: string
  /** The state this screen is waiting to leave. The poll stops and refreshes the route when it does. */
  waiting: Extract<AnalysisState, 'measuring' | 'generating'>
  /**
   * `bare` drops the browser frame, for the report that is already showing this page's screenshot
   * further down: one picture of the same page is evidence, two is decoration.
   */
  variant?: 'page' | 'inline' | 'bare'
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.report.progress
  const { stalled, progress } = useAnalysisPoll(embedKey, waiting)

  const elapsed = useElapsed()
  const tip = useRotating(copy.tips.length)

  const measured = progress?.measured ?? waiting === 'generating'
  const generated = progress?.generated ?? false
  const phases = useMemo(
    () => phasesFor({ steps: progress?.steps ?? [], measured, generated }),
    [progress?.steps, measured, generated]
  )

  const shot = progress?.screenshotUrl ?? null
  const score = progress?.score ?? null
  const pages = progress?.crawledPages ?? null

  return (
    <section
      className={cn('space-y-4 print:hidden', variant === 'page' && 'animate-fade-up')}
      role="status"
      aria-live="polite"
      aria-busy
      data-testid={waiting === 'measuring' ? 'measuring' : 'generating-notice'}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          className={cn(
            'font-display font-bold tracking-tight',
            variant === 'page' ? 'text-xl' : 'text-base'
          )}
        >
          {measured ? copy.titleWriting : copy.title}
        </h2>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{elapsed}</span>
      </div>

      {variant !== 'bare' && (
      <div className="overflow-hidden rounded-lg border bg-card shadow-elev-1">
        <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2">
          <span className="flex gap-1.5" aria-hidden>
            <i className="size-2 rounded-full bg-muted-foreground/30" />
            <i className="size-2 rounded-full bg-muted-foreground/30" />
            <i className="size-2 rounded-full bg-muted-foreground/30" />
          </span>
          <span className="min-w-0 flex-1 truncate rounded-sm bg-background px-2 py-1 font-mono text-xs text-muted-foreground">
            {progress?.url ?? url}
          </span>
        </div>

        <div
          className={cn(
            'relative overflow-hidden bg-muted',
            variant === 'page' ? 'aspect-[4/3] sm:aspect-[16/10]' : 'aspect-[16/9]'
          )}
        >
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shot}
              alt=""
              aria-hidden
              className="size-full object-cover object-top opacity-90"
            />
          ) : (
            <PageWireframe />
          )}

          {/* The band that reads the page. Decoration over a real picture, so it says nothing to a
              screen reader and stops entirely under reduced motion. */}
          <span
            aria-hidden
            className="animate-scan absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-primary/15 to-transparent"
          />
        </div>
      </div>
      )}

      {(score !== null || pages !== null || shot) && (
        <ul className="flex flex-wrap gap-2">
          {score !== null && <Chip>{t(copy.chipScore, { score })}</Chip>}
          {pages !== null && <Chip>{t(copy.chipPages, { count: pages })}</Chip>}
          {shot && <Chip>{copy.chipShot}</Chip>}
        </ul>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {RUN_PHASE.map((phase) => (
          <PhaseRow key={phase} state={phases[phase]} label={copy.phases[phase]} />
        ))}
      </ul>

      {/* On the report the sections are already on screen, so the useful sentence is that the reader
          may leave and come back. On an empty screen it is what the audit covers. */}
      <p className="text-sm text-muted-foreground">
        {stalled
          ? copy.stalled
          : variant === 'bare'
            ? dictionary.report.generating.note
            : copy.tips[tip]}
      </p>
    </section>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="animate-pop-in rounded-full border bg-muted/50 px-3 py-1 font-mono text-xs tabular-nums">
      {children}
    </li>
  )
}

function PhaseRow({ state, label }: { state: PhaseState; label: string }) {
  return (
    <li
      className={cn(
        'flex items-center gap-2 text-sm',
        state === 'waiting' ? 'text-muted-foreground/50' : 'text-foreground'
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden>
        {state === 'done' ? (
          <Check className="size-4 text-green" />
        ) : state === 'active' ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <i className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      {label}
    </li>
  )
}

/**
 * The shape of a landing page, while there is no picture of this one yet.
 *
 * A skeleton of what is coming, the same sweep the route skeletons use, and never a drawing of a
 * page nobody has seen: it carries no text, no numbers and no verdict.
 */
function PageWireframe() {
  return (
    <div className="animate-shimmer size-full space-y-3 p-6" aria-hidden>
      <div className="h-3 w-1/4 rounded-sm bg-muted-foreground/15" />
      <div className="h-6 w-3/4 rounded-sm bg-muted-foreground/20" />
      <div className="h-3 w-2/3 rounded-sm bg-muted-foreground/10" />
      <div className="h-7 w-28 rounded-md bg-muted-foreground/20" />
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="h-12 rounded-md bg-muted-foreground/10" />
        <div className="h-12 rounded-md bg-muted-foreground/10" />
        <div className="h-12 rounded-md bg-muted-foreground/10" />
      </div>
    </div>
  )
}

function useElapsed(): string {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [])

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function useRotating(length: number): number {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % length), PROGRESS_TIP_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [length])

  return index
}
