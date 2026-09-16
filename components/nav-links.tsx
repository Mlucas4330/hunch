'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'
import { ADMIN_ACCOUNTS_PATH, BLOG_PATH, BULK_PATH, POST_SIGNIN_REDIRECT } from '@/lib/constants'
import { cn } from '@/lib/utils'

// The bar is for the work: the blog, the pages, the batches, and the operator screen. The account
// screen hangs off the account menu instead, because that is what it is about.
//
// `requiresAdmin` and `requiresBulk` hide a link, and hiding is all either does: the screen behind it
// re-checks the stored role or tier, and so does the route on it. See docs/invariants.md.
const LINKS = [
  { href: BLOG_PATH, key: 'blog', requiresSession: false, requiresAdmin: false, requiresBulk: false },
  { href: POST_SIGNIN_REDIRECT, key: 'dashboard', requiresSession: true, requiresAdmin: false, requiresBulk: false },
  { href: BULK_PATH, key: 'bulk', requiresSession: true, requiresAdmin: false, requiresBulk: true },
  { href: ADMIN_ACCOUNTS_PATH, key: 'admin', requiresSession: true, requiresAdmin: true, requiresBulk: false }
] as const

export function NavLinks({
  signedIn,
  admin,
  bulk,
  bulkReady = false
}: {
  signedIn: boolean
  admin: boolean
  bulk: boolean
  /** A batch has finished and its table has not been opened yet. */
  bulkReady?: boolean
}) {
  const pathname = usePathname()
  const { dictionary } = useI18n()

  return (
    <>
      {LINKS.filter(
        (link) =>
          (signedIn || !link.requiresSession) &&
          (admin || !link.requiresAdmin) &&
          (bulk || !link.requiresBulk)
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
            {/* A batch finishes long after the page that queued it was left, so the bar is the one
                place that can say so. A word rather than a bare dot: a coloured dot on its own is
                decoration until you already know what it means. */}
            {link.requiresBulk && bulkReady && (
              <span className="ml-1.5 rounded-full bg-purple/15 px-1.5 py-0.5 text-nano text-purple">
                {dictionary.nav.bulkReady}
              </span>
            )}
          </Link>
        )
      })}
    </>
  )
}
