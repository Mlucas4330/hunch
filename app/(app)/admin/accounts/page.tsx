import { notFound } from 'next/navigation'
import { isAdmin } from '@/lib/auth-policy'
import { listAccountQuotas } from '@/lib/quota'
import { getCurrentUser } from '@/lib/current-user'
import { SetQuotaForm } from '@/components/set-quota-form'
import { Card, CardContent } from '@/components/ui/card'
import { ADMIN_ACCOUNTS_PATH } from '@/lib/constants'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.admin, path: ADMIN_ACCOUNTS_PATH, index: false })
}

/**
 * The monthly quota of every account, set by hand once the subscription is closed outside the app.
 *
 * `notFound()` rather than a 403: whoever reaches this line is signed in and simply not an operator,
 * and telling them the screen exists is an invitation. The check is repeated in the action. See
 * docs/invariants.md.
 */
export default async function AdminAccountsPage() {
  const user = await getCurrentUser()
  if (!isAdmin(user)) notFound()

  const locale = await getLocale()
  const t = dictionaryFor(locale)
  const copy = t.admin.accounts

  const accounts = await listAccountQuotas()

  return (
    <div className="animate-fade-up space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{t.admin.eyebrow}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <SetQuotaForm />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="panel-label text-micro text-muted-foreground">{copy.listTitle}</h2>

        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.listEmpty}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card" data-testid="account-quotas">
            {accounts.map((account) => (
              <li key={account.email} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="font-mono text-sm">{account.email}</span>
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  {fill(copy.usage, { used: account.used, limit: account.limit })}
                  {account.trial > 0 && ` ${fill(copy.trial, { count: account.trial })}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
