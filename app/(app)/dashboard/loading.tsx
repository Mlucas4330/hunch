import { RouteSkeleton } from '@/components/route-skeleton'
import { ROUTE_SKELETON } from '@/lib/enums'

export default function Loading() {
  return <RouteSkeleton variant={ROUTE_SKELETON[0]} />
}
