import { t as fill } from '@/lib/i18n/format'
import { displayHost } from '@/lib/host'
import type { Dictionary } from '@/lib/i18n'
import type { ReportBrand } from '@/lib/report'

export type ReportCoverCounts = {
  changes: number
  ready: number
  structural: number
}

export function ReportCover({
  t,
  brand,
  url,
  generated,
  counts
}: {
  t: Dictionary
  brand: ReportBrand
  url: string
  generated: string
  counts: ReportCoverCounts
}) {
  const host = displayHost(url)

  return (
    <section className="space-y-4">
      <div
        aria-hidden
        className="h-1 w-16 rounded-full bg-purple"
        style={brand.accent ? { backgroundColor: brand.accent } : undefined}
      />

      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">
          {brand.name ? fill(t.report.preparedBy, { name: brand.name }) : t.report.teardown}
        </p>
        <h1 className="text-balance font-display text-3xl font-bold tracking-tight">{host}</h1>
        <p className="break-all font-mono text-sm text-muted-foreground">{url}</p>
      </div>

      <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
        {fill(t.report.summaryBody, counts)}
      </p>

      <p className="panel-label text-[0.65rem] text-muted-foreground">
        {fill(t.report.dated, { date: generated })}
      </p>
    </section>
  )
}
