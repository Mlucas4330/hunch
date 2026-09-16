'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { useBatchPoll } from '@/components/use-batch-poll'
import { REPORT_PATH } from '@/lib/constants'
import type { BulkBatch } from '@/lib/bulk-batches'
import { t } from '@/lib/i18n/format'

/**
 * What a batch found, one row per URL.
 *
 * Every cell is a number the report already carries. **A page PageSpeed could not measure has no
 * score and shows a dash, never a zero**, and a row whose run failed says so instead of showing
 * numbers from the run before it. See docs/invariants.md.
 */
export function BulkResults({ batch }: { batch: BulkBatch }) {
  const { dictionary } = useI18n()
  const copy = dictionary.bulk.results
  const live = useBatchPoll(batch)

  return (
    <section className="space-y-3" data-testid="bulk-results">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {live.finished ? copy.title : copy.running}
        </h2>
        {live.finished && (
          <Button asChild variant="outline" size="sm">
            <a href={`/api/analyses/bulk/${live.id}/csv`} download>
              {copy.download}
            </a>
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-3xl text-sm">
          <thead className="border-b bg-muted/40">
            <tr className="panel-label text-micro text-muted-foreground">
              <th className="p-3 text-left font-normal">{copy.columns.page}</th>
              <th className="p-3 text-left font-normal">{copy.columns.score}</th>
              <th className="p-3 text-left font-normal">{copy.columns.critical}</th>
              <th className="p-3 text-left font-normal">{copy.columns.problem}</th>
              <th className="p-3 text-left font-normal">{copy.columns.report}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {live.rows.map((row) => (
              <tr key={row.url}>
                <td className="max-w-xs break-all p-3 font-mono text-xs">{row.url}</td>
                <td className="p-3 font-mono tabular-nums">
                  {row.score === null ? dictionary.common.none : row.score}
                </td>
                <td className="p-3 font-mono tabular-nums">
                  {row.finished ? row.criticalCount : dictionary.common.none}
                </td>
                <td className="p-3 text-muted-foreground">
                  {row.failed
                    ? copy.failed
                    : row.finished
                      ? (row.mainProblem ?? dictionary.common.none)
                      : copy.pending}
                </td>
                <td className="p-3">
                  {row.embedKey && !row.failed ? (
                    <Link
                      href={`${REPORT_PATH}/${row.embedKey}`}
                      className="underline underline-offset-4"
                    >
                      {t(copy.open, { host: row.host })}
                    </Link>
                  ) : (
                    dictionary.common.none
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
