import { Skeleton } from '@/components/ui/skeleton'

/**
 * What a section holds while its error list is still being written: the shape of the list, not a
 * message about it. The message lives once, above the sections, in `AnalysisProgress`.
 */
export function PendingList() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  )
}
