import { notFound } from 'next/navigation'
import { count, eq, max, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, reportViews, users } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { isAdmin } from '@/lib/auth-policy'
import { Card, CardContent } from '@/components/ui/card'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { formatDate, formatNumber } from '@/lib/i18n/format'
import { displayHost } from '@/lib/host'
import { pageMetadata } from '@/lib/seo'
import { ADMIN_REPORTS_PATH } from '@/lib/constants'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.reports, path: ADMIN_REPORTS_PATH, index: false })
}

export default async function ReportsPage() {
  const user = await getCurrentUser()
  if (!isAdmin(user)) notFound()

  const rows = await db
    .select({
      id: analyses.id,
      url: analyses.url,
      embedKey: analyses.embedKey,
      owner: users.email,
      views: count(reportViews.id),
      lastViewedAt: max(reportViews.createdAt)
    })
    .from(analyses)
    .innerJoin(users, eq(analyses.userId, users.id))
    .leftJoin(reportViews, eq(reportViews.embedKey, analyses.embedKey))
    .groupBy(analyses.id, users.email)
    .orderBy(sql`max(${reportViews.createdAt}) desc nulls last`)

  const locale = await getLocale()
  const t = dictionaryFor(locale)
  const opened = rows.filter((row) => row.views > 0).length

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{t.reports.eyebrow}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t.reports.title}
          <span className="ml-2 font-mono text-base tabular-nums text-muted-foreground">
            {opened}/{rows.length}
          </span>
        </h1>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t.reports.empty}</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <Th>{t.reports.page}</Th>
                <Th>{t.reports.owner}</Th>
                <Th>{t.reports.views}</Th>
                <Th>{t.reports.lastOpened}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <Td>
                    <a href={`/r/${row.embedKey}`} className="font-medium hover:underline">
                      {displayHost(row.url)}
                    </a>
                  </Td>
                  <Td>{row.owner}</Td>
                  <Td>
                    <span className="font-mono tabular-nums">
                      {formatNumber(row.views, locale)}
                    </span>
                  </Td>
                  <Td>
                    {row.lastViewedAt ? formatDate(row.lastViewedAt, locale) : t.reports.never}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="panel-label px-4 py-2 text-left text-[0.65rem] text-muted-foreground">
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2 text-muted-foreground">{children}</td>
}
