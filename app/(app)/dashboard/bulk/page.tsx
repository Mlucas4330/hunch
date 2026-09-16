import { notFound, redirect } from 'next/navigation'
import { BulkForm } from '@/components/bulk-form'
import { BulkResults } from '@/components/bulk-results'
import { Card, CardContent } from '@/components/ui/card'
import { canBulkGenerate } from '@/lib/auth-policy'
import { loadBatch, unreadBatch } from '@/lib/bulk-batches'
import { BULK_PATH, BULK_URLS_MAX, SIGNIN_PATH } from '@/lib/constants'
import { getCurrentUser } from '@/lib/current-user'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { quotaFor, quotaLeft } from '@/lib/quota'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.bulk, path: BULK_PATH, index: false })
}

/**
 * Auditing a list of pages in one go, for the tiers it is sold with.
 *
 * **`notFound()` rather than a message**, the same answer `/admin/accounts` gives someone without the
 * role: a page that explains what you cannot reach is an invitation to try. The route behind the form
 * checks the tier again, because that is the boundary. See docs/invariants.md.
 */
export default async function BulkPage({
  searchParams
}: {
  searchParams: Promise<{ batch?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect(SIGNIN_PATH)
  if (!canBulkGenerate(user)) notFound()

  const t = dictionaryFor(await getLocale())
  const { batch: requested } = await searchParams

  const [quota, notice] = await Promise.all([quotaFor(user.id), unreadBatch(user.id)])
  const batchId = requested ?? notice?.id ?? null
  const batch = batchId ? await loadBatch(batchId, user.id) : null

  return (
    <div className="animate-fade-up space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{t.bulk.eyebrow}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t.bulk.title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {fill(t.bulk.subtitle, { max: BULK_URLS_MAX })}
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <BulkForm remaining={quotaLeft(quota)} />
        </CardContent>
      </Card>

      {batch && <BulkResults batch={batch} />}
    </div>
  )
}
