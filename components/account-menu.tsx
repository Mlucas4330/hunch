import Link from 'next/link'
import { signOut } from '@/auth'
import { SETTINGS_PATH } from '@/lib/constants'
import { Dropdown } from '@/components/ui/dropdown'
import { SubmitButton } from '@/components/submit-button'
import { getDictionary } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { quotaFor } from '@/lib/quota'

// The quota is read from the rows here and never carried in the session. See docs/invariants.md.
type AccountUser = {
  id: string
  name?: string | null
  email?: string | null
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
    <Dropdown
      testId="account-menu"
      className="group relative"
      summaryClassName="flex list-none items-center gap-2 rounded-sm border px-2 py-1 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      summary={
        <>
          <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary font-mono text-xs font-semibold text-primary-foreground">
            {initial}
          </span>
          <span className="max-w-[8rem] truncate">{label}</span>
        </>
      }
      panelClassName="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md border bg-card p-3 shadow-elev-3 group-open:animate-pop-in"
    >
      <AccountPanel user={user} />
    </Dropdown>
  )
}

export async function AccountPanel({ user }: { user: AccountUser }) {
  const t = await getDictionary()
  const quota = await quotaFor(user.id)

  return (
    <>
      <div className="space-y-1">
        {user.name && <p className="text-sm font-medium">{user.name}</p>}
        {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
      </div>

      <p className="mt-3 border-t pt-3 text-xs text-muted-foreground" data-testid="quota-usage">
        {fill(t.quota.usage, { used: quota.used, limit: quota.limit })}
      </p>

      {/* The account screen belongs to the account, not to the main nav, which is for the work:
          pages, bulk, the blog. See docs/analysis-ui.md. */}
      <div className="mt-3 border-t pt-3">
        <Link
          href={SETTINGS_PATH}
          className="flex min-h-9 items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.nav.settings}
        </Link>
      </div>

      <form action={signOutAction} className="mt-3 border-t pt-3">
        <SubmitButton variant="ghost" className="h-auto w-full justify-start px-2 py-1.5">
          {t.nav.signOut}
        </SubmitButton>
      </form>
    </>
  )
}
