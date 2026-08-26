'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'
import { ADMIN_CREDITS_PATH, BLOG_PATH, CREDITS_ANCHOR, HOW_ANCHOR, POST_SIGNIN_REDIRECT } from '@/lib/constants'
import { cn } from '@/lib/utils'

// `requiresAdmin` hides a link, and hiding is all it does: the screen behind it re-checks the
// stored role and so does the action on it. A nav that renders no link to a route nobody may open is
// tidiness, never the boundary. See docs/invariants.md.
//
// `anchor` marks the two links that point at a section of the landing page rather than at a route.
// They are flagged rather than left to fall through the `active` check below, because that check
// compares against `pathname`, which never carries a hash: the comparison would answer false for a
// reason that has nothing to do with where the reader is.
const LINKS = [
  { href: HOW_ANCHOR, key: 'how', requiresSession: false, requiresAdmin: false, anchor: true },
  { href: CREDITS_ANCHOR, key: 'pricing', requiresSession: false, requiresAdmin: false, anchor: true },
  { href: BLOG_PATH, key: 'blog', requiresSession: false, requiresAdmin: false, anchor: false },
  { href: POST_SIGNIN_REDIRECT, key: 'dashboard', requiresSession: true, requiresAdmin: false, anchor: false },
  { href: ADMIN_CREDITS_PATH, key: 'admin', requiresSession: true, requiresAdmin: true, anchor: false }
] as const

export function NavLinks({ signedIn, admin }: { signedIn: boolean; admin: boolean }) {
  const pathname = usePathname()
  const { dictionary } = useI18n()

  return (
    <>
      {LINKS.filter(
        (link) =>
          (signedIn || !link.requiresSession) && (admin || !link.requiresAdmin)
      ).map((link) => {
        const active = !link.anchor && pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'panel-label rounded-sm text-[0.7rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
