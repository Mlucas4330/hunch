import { notFound } from 'next/navigation'
import { desc } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { isAdmin } from '@/lib/auth-policy'
import { grantPlan } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PlanBadge } from '@/components/plan-badge'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { formatDate } from '@/lib/i18n/format'
import { pageMetadata } from '@/lib/seo'
import { ADMIN_ACCOUNTS_PATH, ADMIN_ROLE, DEFAULT_PLAN, PAID_PLAN } from '@/lib/constants'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.accounts, path: ADMIN_ACCOUNTS_PATH, index: false })
}

export default async function AccountsPage() {
  const user = await getCurrentUser()
  if (!isAdmin(user)) notFound()

  const rows = await db.select().from(users).orderBy(desc(users.createdAt))
  const locale = await getLocale()
  const t = dictionaryFor(locale)
  const paid = rows.filter((row) => row.plan === PAID_PLAN).length

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{t.accounts.eyebrow}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t.accounts.title}
          <span className="ml-2 font-mono text-base tabular-nums text-muted-foreground">
            {paid}/{rows.length}
          </span>
        </h1>
      </div>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="space-y-1">
            <h2 className="font-medium">{t.accounts.grantTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.accounts.grantHint}</p>
          </div>
          <form action={grantPlan} className="flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="plan" value={PAID_PLAN} />
            <Input
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder={t.accounts.emailPlaceholder}
            />
            <Button type="submit" className="sm:w-auto">
              {t.accounts.grantSubmit}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <Th>{t.accounts.email}</Th>
              <Th>{t.accounts.plan}</Th>
              <Th>{t.accounts.lastSignIn}</Th>
              <Th>{t.accounts.stripeCustomer}</Th>
              <Th>{t.accounts.joined}</Th>
              <Th>{t.accounts.action}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <Td>
                  <a href={`mailto:${row.email}`} className="font-medium hover:underline">
                    {row.email}
                  </a>
                  {row.role === ADMIN_ROLE && (
                    <span className="ml-2 panel-label text-[0.6rem] text-muted-foreground">
                      {t.labels.userRole[ADMIN_ROLE]}
                    </span>
                  )}
                </Td>
                <Td>
                  <PlanBadge plan={row.plan} />
                </Td>
                <Td>
                  {row.lastSignInAt ? (
                    formatDate(row.lastSignInAt, locale)
                  ) : (
                    <span className="text-muted-foreground">{t.accounts.neverSignedIn}</span>
                  )}
                </Td>
                <Td>
                  {row.stripeCustomerId ? (
                    <span className="font-mono text-xs">{row.stripeCustomerId}</span>
                  ) : (
                    t.common.none
                  )}
                </Td>
                <Td>{formatDate(row.createdAt, locale)}</Td>
                <Td>
                  <form action={grantPlan}>
                    <input type="hidden" name="email" value={row.email} />
                    <input
                      type="hidden"
                      name="plan"
                      value={row.plan === PAID_PLAN ? DEFAULT_PLAN : PAID_PLAN}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      {row.plan === PAID_PLAN ? t.accounts.revoke : t.accounts.grant}
                    </Button>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
