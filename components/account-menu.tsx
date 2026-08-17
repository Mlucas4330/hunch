import Link from 'next/link'
import { signOut } from '@/auth'
import { PlanBadge } from '@/components/plan-badge'
import { isAdmin } from '@/lib/auth-policy'
import { ADMIN_NAV_LINKS } from '@/lib/constants'
import type { SubscriptionPlan, UserRole } from '@/lib/enums'
import { getDictionary } from '@/lib/i18n'

type AccountUser = {
  name?: string | null
  email?: string | null
  plan: SubscriptionPlan
  role: UserRole
}

async function signOutAction() {
  'use server'
  await signOut({ redirectTo: '/auth/signin' })
}

export async function AccountMenu({ user }: { user: AccountUser }) {
  const t = await getDictionary()
  const label = user.name ?? user.email ?? t.nav.account
  const initial = label.charAt(0).toUpperCase()

  return (
    <details className="group relative" data-testid="account-menu">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm border px-2 py-1 text-sm transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
        <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary font-mono text-xs font-semibold text-primary-foreground">
          {initial}
        </span>
        <span className="max-w-[8rem] truncate">{label}</span>
      </summary>

      <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border bg-card p-3 shadow-sm">
        <AccountPanel user={user} />
      </div>
    </details>
  )
}

export async function AccountPanel({ user }: { user: AccountUser }) {
  const t = await getDictionary()

  return (
    <>
      <div className="space-y-1">
        {user.name && <p className="text-sm font-medium">{user.name}</p>}
        {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
        <div className="pt-1">
          <PlanBadge plan={user.plan} />
        </div>
      </div>
      {isAdmin(user) && (
        <div className="mt-3 space-y-1 border-t pt-3">
          <p className="panel-label px-2 text-[0.6rem] text-muted-foreground">{t.nav.admin}</p>
          {ADMIN_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              {t[link.key].title}
            </Link>
          ))}
        </div>
      )}

      <form action={signOutAction} className="mt-3 border-t pt-3">
        <button
          type="submit"
          className="w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
        >
          {t.nav.signOut}
        </button>
      </form>
    </>
  )
}
