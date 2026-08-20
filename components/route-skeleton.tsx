'use client'

import { useI18n } from '@/components/i18n-provider'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTE_SKELETON } from '@/lib/enums'
import type { RouteSkeleton as Variant } from '@/lib/enums'

/**
 * The shell a route paints while its server work runs.
 *
 * Every page here is a dynamic Server Component, so without a `loading.tsx` the browser holds the
 * previous screen untouched until the whole render lands -- a click that looks ignored. These shapes
 * are deliberately the layout of the page that is coming, not a centred spinner, so the transition
 * reads as the page filling in rather than as a different screen flashing past.
 */
export function RouteSkeleton({ variant }: { variant: Variant }) {
  const { dictionary } = useI18n()

  return (
    <div
      className="animate-fade-up space-y-6"
      role="status"
      aria-busy
      aria-label={dictionary.common.loading}
    >
      {variant === ROUTE_SKELETON[0] ? <ListShell /> : <DetailShell />}
    </div>
  )
}

function Heading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  )
}

function ListShell() {
  return (
    <>
      <Heading />
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="flex flex-col gap-3 p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
    </>
  )
}

function DetailShell() {
  return (
    <>
      <Heading />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className="space-y-2 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} className="flex items-center gap-3 p-4">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-10" />
          </Card>
        ))}
      </div>
    </>
  )
}
