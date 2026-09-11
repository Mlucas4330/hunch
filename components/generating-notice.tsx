'use client'

import { useI18n } from '@/components/i18n-provider'
import { useAnalysisPoll } from '@/components/use-analysis-poll'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * The wait, on the report rather than on the form: the sections are already on the page with what was
 * measured, and this says their error lists are still being written. It polls, and refreshes the page
 * once they land.
 */
export function GeneratingNotice({ embedKey }: { embedKey: string }) {
  const { dictionary } = useI18n()
  const copy = dictionary.report.generating
  const stalled = useAnalysisPoll(embedKey, 'generating')

  return (
    <div className="space-y-1" role="status" aria-busy data-testid="generating-notice">
      <p className="panel-label text-micro text-muted-foreground">{copy.eyebrow}</p>
      <p className="text-sm text-muted-foreground">{stalled ? copy.stalled : copy.note}</p>
    </div>
  )
}

export function PendingList() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  )
}
