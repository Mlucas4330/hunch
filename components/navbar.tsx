import Link from 'next/link'
import { getCurrentUser } from '@/lib/current-user'
import { AccountMenu, AccountPanel } from '@/components/account-menu'
import { MobileMenu } from '@/components/mobile-menu'
import { NavLinks } from '@/components/nav-links'
import { LanguageToggle } from '@/components/language-toggle'
import { Wordmark } from '@/components/wordmark'
import { Button } from '@/components/ui/button'
import { CONTAINER_CLASS } from '@/lib/constants'
import { dictionaryFor, getLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export async function Navbar() {
  const user = await getCurrentUser()
  const locale = await getLocale()
  const t = dictionaryFor(locale)

  return (
    <header className="sticky top-0 z-40 border-b bg-paper/80 backdrop-blur print:hidden">
      <nav className={cn(CONTAINER_CLASS, 'flex h-16 items-center justify-between gap-3')}>
        <Link href="/" aria-label={t.nav.homeAria}>
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          {user ? (
            <>
              <NavLinks />
              <LanguageToggle locale={locale} />
              <AccountMenu user={user} />
            </>
          ) : (
            <>
              <LanguageToggle locale={locale} />
              <Button asChild size="sm">
                <Link href="/auth/signin">{t.nav.signIn}</Link>
              </Button>
            </>
          )}
        </div>

        <MobileMenu label={t.nav.menuAria}>
          {user ? (
            <>
              <div className="flex flex-col items-start gap-2">
                <NavLinks />
              </div>
              <div className="flex">
                <LanguageToggle locale={locale} />
              </div>
              <div className="border-t pt-3">
                <AccountPanel user={user} />
              </div>
            </>
          ) : (
            <>
              <div className="flex">
                <LanguageToggle locale={locale} />
              </div>
              <Button asChild size="sm" className="w-full">
                <Link href="/auth/signin">{t.nav.signIn}</Link>
              </Button>
            </>
          )}
        </MobileMenu>
      </nav>
    </header>
  )
}
