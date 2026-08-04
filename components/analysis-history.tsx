'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/components/i18n-provider'
import { t } from '@/lib/i18n/format'

type HistoryItem = { id: string; url: string; date: string }

export function AnalysisHistory({ analyses }: { analyses: HistoryItem[] }) {
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
    <div className="space-y-3" data-testid="analysis-history">
      {analyses.map((analysis) => {
        const confirming = confirmingId === analysis.id
        const deleting = deletingId === analysis.id
        return (
          <Card
            key={analysis.id}
            className="relative transition-all hover:-translate-y-0.5 hover:border-foreground/20"
          >
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <Link
                href={`/analyses/${analysis.id}`}
                aria-label={t(dictionary.history.openAria, { url: analysis.url })}
                className="absolute inset-0 rounded-lg"
              />
              <span className="truncate font-mono text-sm">{analysis.url}</span>
              <div className="relative z-10 flex shrink-0 items-center gap-3">
                <span className="panel-label text-[0.65rem] text-muted-foreground">
                  {analysis.date}
                </span>
                {confirming ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleting}
                      onClick={() => onDelete(analysis.id)}
                    >
                      {deleting ? dictionary.common.deleting : dictionary.common.delete}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deleting}
                      onClick={() => setConfirmingId(null)}
                    >
                      {dictionary.common.cancel}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t(dictionary.history.deleteAria, { url: analysis.url })}
                    onClick={() => setConfirmingId(analysis.id)}
                    className="text-muted-foreground hover:text-red"
                  >
                    {dictionary.common.delete}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
