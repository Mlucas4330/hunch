import Link from 'next/link'
import { getCurrentUser } from '@/lib/current-user'
import { AccountMenu } from '@/components/account-menu'
import { NavLinks } from '@/components/nav-links'
import { LanguageToggle } from '@/components/language-toggle'
import { Wordmark } from '@/components/wordmark'
import { Button } from '@/components/ui/button'
import { dictionaryFor, getLocale } from '@/lib/i18n'

export async function Navbar() {
  const user = await getCurrentUser()
  const locale = await getLocale()
  const t = dictionaryFor(locale)

  return (
    <header className="sticky top-0 z-40 border-b bg-paper/80 backdrop-blur print:hidden">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label={t.nav.homeAria}>
          <Wordmark />
        </Link>

        <div className="flex items-center gap-5">
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
      </nav>
    </header>
  )
}
