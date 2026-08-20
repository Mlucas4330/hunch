import { signOut } from '@/auth'
import { SubmitButton } from '@/components/submit-button'
import { getDictionary } from '@/lib/i18n'

type AccountUser = {
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
    <details className="group relative" data-testid="account-menu">
      <summary className="flex list-none items-center gap-2 rounded-sm border px-2 py-1 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary font-mono text-xs font-semibold text-primary-foreground">
          {initial}
        </span>
        <span className="max-w-[8rem] truncate">{label}</span>
      </summary>

      <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md border bg-card p-3 shadow-sm group-open:animate-pop-in">
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
      </div>

      <form action={signOutAction} className="mt-3 border-t pt-3">
        <SubmitButton variant="ghost" className="h-auto w-full justify-start px-2 py-1.5">
          {t.nav.signOut}
        </SubmitButton>
      </form>
    </>
  )
}
