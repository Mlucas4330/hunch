'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CopyReportLink } from '@/components/copy-report-link'
import { useI18n } from '@/components/i18n-provider'
import { groupByClient } from '@/lib/host'
import { t } from '@/lib/i18n/format'

type HistoryItem = {
  id: string
  url: string
  embedKey: string
  client: string
  page: string
  score: number | null
  previousScore: number | null
  market: string
  date: string
}

export function AnalysisHistory({
  analyses,
  appUrl
}: {
  analyses: HistoryItem[]
  appUrl: string
}) {
  const { dictionary } = useI18n()
  const router = useRouter()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function onDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/analyses/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
    } finally {
      setDeletingId(null)
      setConfirmingId(null)
    }
  }

  return (
    <div className="space-y-8" data-testid="analysis-history">
      {groupByClient(analyses).map((group) => (
        <section key={group.client} className="space-y-3" data-testid="analysis-client">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="min-w-0 truncate font-display text-lg font-semibold tracking-tight">
              {group.client}
            </h2>
            <ClientTrend items={group.items} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{group.items.map(renderCard)}</div>
        </section>
      ))}
    </div>
  )

  function renderCard(analysis: HistoryItem) {
        const confirming = confirmingId === analysis.id
        const deleting = deletingId === analysis.id
        return (
          <Card
            key={analysis.id}
            className="relative flex flex-col hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-elev-2 focus-within:-translate-y-0.5 focus-within:border-foreground/20"
          >
            <CardContent className="flex flex-1 flex-col gap-3 p-4">
              <Link
                href={`/r/${analysis.embedKey}`}
                aria-label={t(dictionary.history.openAria, { url: analysis.url })}
                className="absolute inset-0 rounded-lg focus-visible:outline-none"
              />
              <div className="flex items-start justify-between gap-2">
                {/* The page, not the client: the client names the group this card sits in. */}
                <h3 className="truncate font-display text-base font-semibold tracking-tight">
                  {analysis.page}
                </h3>
                <div className="relative z-10 flex shrink-0 items-center gap-1">
                  {confirming ? (
                    <>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        disabled={deleting}
                        aria-label={
                          deleting ? dictionary.common.deleting : dictionary.common.delete
                        }
                        onClick={() => onDelete(analysis.id)}
                      >
                        <Check aria-hidden className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={deleting}
                        aria-label={dictionary.common.cancel}
                        onClick={() => setConfirmingId(null)}
                      >
                        <X aria-hidden className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red"
                      aria-label={t(dictionary.history.deleteAria, { url: analysis.url })}
                      onClick={() => setConfirmingId(analysis.id)}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <p className="break-all font-mono text-xs text-muted-foreground">{analysis.url}</p>

              <div className="mt-auto space-y-2">
                <div className="panel-label flex items-center gap-2 text-micro text-muted-foreground">
                  <span>{analysis.date}</span>
                  <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-border" />
                  <span className="truncate">{analysis.market}</span>
                </div>
                {/* `relative z-10` escapes the card's `absolute inset-0` overlay link, the same
                    escape the delete cluster uses. */}
                <CopyReportLink
                  reportUrl={appUrl}
                  embedKey={analysis.embedKey}
                  className="relative z-10 -ml-2"
                />
              </div>
            </CardContent>
          </Card>
    )
  }
}

/**
 * How this client's pages score, and where they stood before the last run.
 *
 * **Only pages with a number appear**: an analysis PageSpeed could not measure has no score and is
 * simply absent, never a zero in the row. A page run only once has nothing to compare against and
 * shows its score alone. See docs/invariants.md.
 */
function ClientTrend({ items }: { items: HistoryItem[] }) {
  const { dictionary } = useI18n()
  const measured = items.filter((item) => item.score !== null)

  if (measured.length === 0) return null

  return (
    <p className="panel-label flex flex-wrap items-center gap-x-3 text-micro text-muted-foreground">
      <span className="sr-only">{dictionary.history.trendAria}</span>
      {measured.map((item) => (
        <span key={item.id} className="font-mono tabular-nums">
          {item.score}
          {item.previousScore !== null && (
            <span className="text-nano"> {t(dictionary.history.wasScore, { score: item.previousScore })}</span>
          )}
        </span>
      ))}
    </p>
  )
}
