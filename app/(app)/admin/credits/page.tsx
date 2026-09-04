import { notFound } from 'next/navigation'
import { isAdmin } from '@/lib/auth-policy'
import { creditsFor, recentGrants } from '@/lib/credits'
import { getCurrentUser } from '@/lib/current-user'
import { CreditBalance } from '@/components/credit-balance'
import { GrantCreditsForm } from '@/components/grant-credits-form'
import { Card, CardContent } from '@/components/ui/card'
import { ADMIN_CREDITS_PATH, ADMIN_GRANT_HISTORY } from '@/lib/constants'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { formatDate } from '@/lib/i18n/format'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.admin, path: ADMIN_CREDITS_PATH, index: false })
}

/**
 * Credits granted by hand, with no payment behind them.
 *
 * **`notFound()` rather than a 403.** Middleware has already turned away anyone with no session, so
 * whoever reaches this line is signed in and simply not an operator, and telling them a screen
 * exists that they may not have is an invitation, not a security boundary. A 404 is the same answer
 * the route would give if it did not exist.
 *
 * The check is repeated in the action this renders, and that is the one that matters: middleware
 * proves a session and never a role, and a server action is reachable without ever loading this page.
 * See docs/invariants.md.
 */
export default async function AdminCreditsPage() {
  const user = await getCurrentUser()
  if (!isAdmin(user) || !user) notFound()

  const locale = await getLocale()
  const t = dictionaryFor(locale)
  const copy = t.admin.credits

  const [credits, grants] = await Promise.all([
    creditsFor(user.id),
    recentGrants(ADMIN_GRANT_HISTORY)
  ])

  return (
    <div className="animate-fade-up space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{t.admin.eyebrow}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <CreditBalance credits={credits} />

      <Card>
        <CardContent className="p-5">
          <GrantCreditsForm defaultEmail={user.email} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="panel-label text-micro text-muted-foreground">{copy.historyTitle}</h2>

        {grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.historyEmpty}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {grants.map((grant, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="font-mono text-sm">{grant.email}</span>
                <span className="flex items-center gap-4">
                  <span className="font-mono text-sm tabular-nums text-green">+{grant.credits}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(grant.at, locale)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
