import Link from 'next/link'
import { getCurrentUser } from '@/lib/current-user'
import { isAdmin } from '@/lib/auth-policy'
import { AccountMenu, AccountPanel } from '@/components/account-menu'
import { MobileMenu } from '@/components/mobile-menu'
import { NavLinks } from '@/components/nav-links'
import { ThemeToggle } from '@/components/theme-toggle'
import { Wordmark } from '@/components/wordmark'
import { Button } from '@/components/ui/button'
import { CONTAINER_CLASS } from '@/lib/constants'
import { dictionaryFor, getLocale } from '@/lib/i18n'
import { getTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export async function Navbar() {
  const user = await getCurrentUser()
  const locale = await getLocale()
  const theme = await getTheme()
  const t = dictionaryFor(locale)

  return (
    // `border-b-transparent` is the resting state and the keyframe brings the rule back with the
    // shadow: at the top of the page the bar is part of the page, and a hairline there is a seam
    // across a surface that has none. See app/globals.css.
    <header className="animate-navbar-lift sticky top-0 z-40 border-b border-b-transparent bg-paper/80 backdrop-blur print:hidden">
      <nav className={cn(CONTAINER_CLASS, 'flex h-16 items-center justify-between gap-3')}>
        {/* The bar is `h-16`, so the room is already there -- the link just was not claiming it, and
            a 28px box in a 64px bar is a tap target the metric counts and a thumb misses. */}
        <Link href="/" aria-label={t.nav.homeAria} className="flex min-h-11 items-center">
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          <NavLinks signedIn={Boolean(user)} admin={isAdmin(user)} />
          {/* Outside the account menu on purpose: a signed-out reader on the landing page or a
              public report is exactly who needs it, and burying it behind a sign-in would be a
              preference only paying readers get. */}
          <ThemeToggle theme={theme} />
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <Button asChild size="sm">
              <Link href="/auth/signin">{t.nav.signIn}</Link>
            </Button>
          )}
        </div>

        <MobileMenu label={t.nav.menuAria}>
          <div className="flex flex-col items-start gap-2">
            <NavLinks signedIn={Boolean(user)} admin={isAdmin(user)} />
          </div>
          <div className="border-t pt-3">
            <ThemeToggle theme={theme} />
          </div>
          {user ? (
            <div className="border-t pt-3">
              <AccountPanel user={user} />
            </div>
          ) : (
            <Button asChild size="sm" className="w-full">
              <Link href="/auth/signin">{t.nav.signIn}</Link>
            </Button>
          )}
        </MobileMenu>
      </nav>
    </header>
  )
}
