'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/dashboard', key: 'dashboard' },
  { href: '/settings', key: 'settings' }
] as const

export function NavLinks() {
  const pathname = usePathname()
  const { dictionary } = useI18n()

  return (
    <>
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'panel-label text-[0.7rem] transition-colors',
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
