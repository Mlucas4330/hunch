import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'
import { listAnalysesForUser } from '@/lib/analyses'
import { usageFor } from '@/lib/usage'
import { UrlInputForm } from '@/components/url-input-form'
import { UsageBanner } from '@/components/usage-banner'
import { AnalysisHistory } from '@/components/analysis-history'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { displayHost } from '@/lib/host'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { formatDate } from '@/lib/i18n/format'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.dashboard, path: '/dashboard', index: false })
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/signin')

  const locale = await getLocale()
  const t = dictionaryFor(locale)

  const { rows } = await listAnalysesForUser(user)
  const usage = usageFor(user)
  const defaultBrief = rows.find((row) => row.brief)?.brief ?? ''

  return (
    <div className="animate-fade-up space-y-6">
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

      <UsageBanner used={usage.analyses_count} limit={usage.limit} />

      <UrlInputForm
        plan={user.plan}
        defaultBrief={defaultBrief}
        blocked={usage.limit !== null && usage.analyses_count >= usage.limit}
      />

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
      )}
    </div>
  )
}
