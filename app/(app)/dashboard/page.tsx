import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/current-user'
import { listAnalysesForUser, parsePaging } from '@/lib/analyses'
import { quotaFor, quotaLeft } from '@/lib/quota'
import { UrlInputForm } from '@/components/url-input-form'
import { AnalysisHistory } from '@/components/analysis-history'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { displayHost } from '@/lib/host'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
// Aliased: this page already binds `t` to the dictionary.
import { formatDate, t as interpolate } from '@/lib/i18n/format'
import { pageMetadata } from '@/lib/seo'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.dashboard, path: '/dashboard', index: false })
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/signin')

  const locale = await getLocale()
  const t = dictionaryFor(locale)

  // The page lives in the URL rather than in client state: it survives a reload and the back button
  // works.
  const { page } = await searchParams
  const [{ rows, pages, page: current }, quota] = await Promise.all([
    listAnalysesForUser(user, { page: parsePaging(page) }),
    quotaFor(user.id)
  ])
  const exhausted = quotaLeft(quota) === 0

  return (
    <div className="animate-fade-up space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{t.dashboard.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <InfoHint label={t.dashboard.hintLabel}>
            <RichText>{t.dashboard.hint}</RichText>
          </InfoHint>
        </div>
        <p className="text-sm text-muted-foreground">{t.dashboard.subtitle}</p>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-xs tabular-nums text-muted-foreground" data-testid="dashboard-quota">
          {interpolate(t.quota.usage, { used: quota.used, limit: quota.limit })}
        </p>
        {exhausted && <p className="text-sm text-amber">{t.quota.none}</p>}
      </div>

      <UrlInputForm blocked={exhausted} />

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-tight">
              {t.dashboard.emptyTitle}
            </CardTitle>
            <CardDescription>{t.dashboard.emptyDescription}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <AnalysisHistory
            appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
            analyses={rows.map((analysis) => ({
              id: analysis.id,
              url: analysis.url,
              embedKey: analysis.embedKey,
              client: displayHost(analysis.url),
              market: t.labels.market[analysis.market],
              date: formatDate(analysis.createdAt, locale)
            }))}
          />
          <Pagination page={current} pages={pages} copy={t.dashboard.pagination} />
        </>
      )}
    </div>
  )
}

/**
 * Newer and older, not previous and next: the grid is ordered newest first, so naming the direction
 * by what is in it answers which way to go. Renders nothing at one page.
 */
function Pagination({
  page,
  pages,
  copy
}: {
  page: number
  pages: number
  copy: Dictionary['dashboard']['pagination']
}) {
  if (pages <= 1) return null

  return (
    <nav aria-label={copy.label} className="flex items-center justify-between gap-4 pt-2">
      <PageStep href={`/dashboard?page=${page - 1}`} disabled={page === 1}>
        {copy.previous}
      </PageStep>
      <p className="panel-label text-micro text-muted-foreground">
        {interpolate(copy.position, { page, pages })}
      </p>
      <PageStep href={`/dashboard?page=${page + 1}`} disabled={page === pages}>
        {copy.next}
      </PageStep>
    </nav>
  )
}

// `scroll={false}` because these controls sit at the bottom of the grid they page, and the default
// scroll to the top threw the reader away from the button they had just pressed.
function PageStep({
  href,
  disabled,
  children
}: {
  href: string
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    )
  }

  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href} scroll={false}>
        {children}
      </Link>
    </Button>
  )
}
