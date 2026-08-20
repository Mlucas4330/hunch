'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReportDeliverables } from '@/components/report-deliverables'
import { useI18n } from '@/components/i18n-provider'
import { t } from '@/lib/i18n/format'

type HistoryItem = {
  id: string
  url: string
  embedKey: string
  client: string
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="analysis-history">
      {analyses.map((analysis) => {
        const confirming = confirmingId === analysis.id
        const deleting = deletingId === analysis.id
        return (
          <Card
            key={analysis.id}
            className="relative flex flex-col hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm focus-within:-translate-y-0.5 focus-within:border-foreground/20"
          >
            <CardContent className="flex flex-1 flex-col gap-3 p-4">
              <Link
                href={`/analyses/${analysis.id}`}
                aria-label={t(dictionary.history.openAria, { url: analysis.url })}
                className="absolute inset-0 rounded-lg focus-visible:outline-none"
              />
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate font-display text-base font-semibold tracking-tight">
                  {analysis.client}
                </h2>
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
                <div className="panel-label flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                  <span>{analysis.date}</span>
                  <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-border" />
                  <span className="truncate">{analysis.market}</span>
                </div>
                <ReportDeliverables
                  variant="compact"
                  reportUrl={appUrl}
                  embedKey={analysis.embedKey}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
