import { notFound } from 'next/navigation'
import { desc } from 'drizzle-orm'
import { db } from '@/db'
import { waitlist } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { isAdmin } from '@/lib/auth-policy'
import { Card, CardContent } from '@/components/ui/card'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { formatDate } from '@/lib/i18n/format'
import { pageMetadata } from '@/lib/seo'
import { ADMIN_LEADS_PATH, LEAD_SOURCE_BADGE_CLASS } from '@/lib/constants'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.leads, path: ADMIN_LEADS_PATH, index: false })
}

export default async function LeadsPage() {
  const user = await getCurrentUser()
  if (!isAdmin(user)) notFound()

  const rows = await db.select().from(waitlist).orderBy(desc(waitlist.createdAt))
  const locale = await getLocale()
  const t = dictionaryFor(locale)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{t.leads.eyebrow}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t.leads.title}
          <span className="ml-2 font-mono text-base tabular-nums text-muted-foreground">
            {rows.length}
          </span>
        </h1>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t.leads.empty}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <Th>{t.leads.email}</Th>
                <Th>{t.leads.source}</Th>
                <Th>{t.leads.phone}</Th>
                <Th>{t.leads.fromReport}</Th>
                <Th>{t.leads.joined}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <Td>
                    <a href={`mailto:${row.email}`} className="font-medium hover:underline">
                      {row.email}
                    </a>
                  </Td>
                  <Td>
                    <span
                      className={`rounded px-1.5 py-0.5 panel-label text-[0.6rem] ${LEAD_SOURCE_BADGE_CLASS[row.source]}`}
                    >
                      {t.labels.leadSource[row.source]}
                    </span>
                  </Td>
                  <Td>{row.phone ?? t.common.none}</Td>
                  <Td>
                    {row.embedKey ? (
                      <a href={`/r/${row.embedKey}`} className="font-mono text-xs text-purple">
                        {row.embedKey.slice(0, 8)}
                      </a>
                    ) : (
                      t.common.none
                    )}
                  </Td>
                  <Td>{formatDate(row.createdAt, locale)}</Td>
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
