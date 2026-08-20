import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/current-user'
import { listAnalysesForUser, parsePaging } from '@/lib/analyses'
import { creditsFor } from '@/lib/credits'
import { UrlInputForm } from '@/components/url-input-form'
import { AnalysisHistory } from '@/components/analysis-history'
import { ClaimAnalyses } from '@/components/claim-analyses'
import { CreditBalance } from '@/components/credit-balance'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { displayHost } from '@/lib/host'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
// Aliased: this page already binds `t` to the dictionary, unlike the rest of the app where `t` is
// this helper. Renaming the local would touch every line here for no gain.
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

  // The page lives in the URL rather than in client state: it survives a reload, the back button
  // works, and the grid stays server rendered with no JavaScript behind it.
  const { page } = await searchParams
  const [{ rows, pages, page: current }, credits] = await Promise.all([
    listAnalysesForUser(user, { page: parsePaging(page) }),
    creditsFor(user.id)
  ])
  const defaultBrief = rows.find((row) => row.brief)?.brief ?? ''

  return (
    <div className="animate-fade-up space-y-6">
      <ClaimAnalyses />
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{t.dashboard.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <InfoHint label={t.dashboard.hintLabel}>
            <RichText>{t.dashboard.hint}</RichText>
          </InfoHint>
        </div>
        <p className="text-sm text-muted-foreground">{t.dashboard.subtitle}</p>
      </div>

      <CreditBalance credits={credits} />

      <UrlInputForm defaultBrief={defaultBrief} />

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
 * Newer and older, not previous and next.
 *
 * The grid is ordered newest first, so "previous" is ambiguous the moment a reader thinks about it:
 * it could mean the page they were just on or the analyses that came before these. Naming the
 * direction by what is in it answers that without a second thought.
 *
 * Renders nothing at one page, so an account with a handful of analyses never sees controls that
 * would go nowhere.
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
      <p className="panel-label text-[0.7rem] text-muted-foreground">
        {interpolate(copy.position, { page, pages })}
      </p>
      <PageStep href={`/dashboard?page=${page + 1}`} disabled={page === pages}>
        {copy.next}
      </PageStep>
    </nav>
  )
}

// A step with nowhere to go is a disabled button, never a link: an anchor cannot be disabled, and one
// that navigates to a page that does not exist is worse than one the reader can see is spent.
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
      <Link href={href}>{children}</Link>
    </Button>
  )
}
