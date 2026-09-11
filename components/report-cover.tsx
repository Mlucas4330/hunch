import type { ReactNode } from 'react'
import { t as fill } from '@/lib/i18n/format'
import { displayHost } from '@/lib/host'
import type { Dictionary } from '@/lib/i18n'

export type ReportCoverCounts = {
  changes: number
  copy: number
  structural: number
}

export function ReportCover({
  t,
  url,
  generated,
  counts,
  hint
}: {
  t: Dictionary
  url: string
  generated: string
  counts: ReportCoverCounts | null
  // A slot rather than a prop of its own because `InfoHint` is a client component and this is not.
  hint?: ReactNode
}) {
  const host = displayHost(url)

  return (
    <section className="space-y-4">
      <div aria-hidden className="h-1 w-16 rounded-full bg-purple" />

      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{t.report.teardown}</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-balance font-display text-3xl font-bold tracking-tight">{host}</h1>
          {hint}
        </div>
        <p className="break-all font-mono text-sm text-muted-foreground">{url}</p>
      </div>

      {/* A report with nothing generated must not print zeroes: "0 errors" reads as a clean page when
          the lists were simply never written. */}
      <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
        {counts ? fill(t.report.summaryBody, counts) : t.report.summaryPending}
      </p>

      <p className="panel-label text-micro text-muted-foreground">
        {fill(t.report.dated, { date: generated })}
      </p>
    </section>
  )
}
