import { t as fill } from '@/lib/i18n/format'
import { displayHost } from '@/lib/host'
import type { Dictionary } from '@/lib/i18n'

export type ReportCoverCounts = {
  changes: number
  ready: number
  structural: number
}

export function ReportCover({
  t,
  url,
  generated,
  counts
}: {
  t: Dictionary
  url: string
  generated: string
  counts: ReportCoverCounts | null
}) {
  const host = displayHost(url)

  return (
    <section className="space-y-4">
      <div aria-hidden className="h-1 w-16 rounded-full bg-purple" />

      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{t.report.teardown}</p>
        <h1 className="text-balance font-display text-3xl font-bold tracking-tight">{host}</h1>
        <p className="break-all font-mono text-sm text-muted-foreground">{url}</p>
      </div>

      {/* **A report with nothing generated must not print zeroes.** `summaryBody` filled with
          counts of 0 reads as "we looked and there is nothing worth changing", which is the opposite
          of what happened: nobody has written the fixes yet. The count sentence is only true once
          there is something to count. */}
      <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
        {counts ? fill(t.report.summaryBody, counts) : t.report.summaryMeasured}
      </p>

      <p className="panel-label text-[0.65rem] text-muted-foreground">
        {fill(t.report.dated, { date: generated })}
      </p>
    </section>
  )
}
