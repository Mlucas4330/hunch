import { NextResponse } from 'next/server'
import { loadBatch, markBatchRead } from '@/lib/bulk-batches'
import { getCurrentUser } from '@/lib/current-user'

export const runtime = 'nodejs'

/**
 * One batch, for the table that polls it.
 *
 * Owner-checked by the query itself: `loadBatch` filters on the user, so a batch belonging to
 * somebody else and a batch that does not exist answer the same 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const batch = await loadBatch(id, user.id)

  if (!batch) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Opening the finished table is what clears the badge in the nav.
  if (batch.finished) await markBatchRead(id, user.id)

  return NextResponse.json(batch)
}
