'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'
import { BLOG_PATH, POST_SIGNIN_REDIRECT } from '@/lib/constants'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: BLOG_PATH, key: 'blog', requiresSession: false },
  { href: POST_SIGNIN_REDIRECT, key: 'dashboard', requiresSession: true }
] as const

export function NavLinks({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname()
  const { dictionary } = useI18n()

  return (
    <>
      {LINKS.filter((link) => signedIn || !link.requiresSession).map((link) => {
        const active = pathname.startsWith(link.href)
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
