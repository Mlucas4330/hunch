'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'
import { ADMIN_ACCOUNTS_PATH, BLOG_PATH, POST_SIGNIN_REDIRECT } from '@/lib/constants'
import { cn } from '@/lib/utils'

// `requiresAdmin` hides a link, and hiding is all it does: the screen behind it re-checks the stored
// role and so does the action on it. See docs/invariants.md.
const LINKS = [
  { href: BLOG_PATH, key: 'blog', requiresSession: false, requiresAdmin: false },
  { href: POST_SIGNIN_REDIRECT, key: 'dashboard', requiresSession: true, requiresAdmin: false },
  { href: ADMIN_ACCOUNTS_PATH, key: 'admin', requiresSession: true, requiresAdmin: true }
] as const

export function NavLinks({ signedIn, admin }: { signedIn: boolean; admin: boolean }) {
  const pathname = usePathname()
  const { dictionary } = useI18n()

  return (
    <>
      {LINKS.filter(
        (link) => (signedIn || !link.requiresSession) && (admin || !link.requiresAdmin)
      ).map((link) => {
        const active = pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            // Below `sm` these render stacked inside the mobile menu, where the row has to clear a
            // thumb. `min-h` plus centring rather than padding keeps the text on its baseline.
            className={cn(
              'panel-label rounded-sm text-micro transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'max-sm:flex max-sm:min-h-11 max-sm:items-center',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {dictionary.nav[link.key]}
          </Link>
        )
      })}
    </>
  )
}
