import { Navbar } from '@/components/navbar'
import { SiteFooter } from '@/components/site-footer'
import { I18nProvider } from '@/components/i18n-provider'
import { getCurrentUser } from '@/lib/current-user'
import { CONTAINER_CLASS } from '@/lib/constants'
import { dictionaryFor, getLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * The report's shell.
 *
 * **The chrome follows the session, not ownership.** A reader who is signed in has an account to get
 * back to, so they get the app's navbar and footer; a reader handed the link has neither, and the
 * report prints its own wordmark instead. That is deliberately a weaker test than the `isOwner` the
 * page runs: someone signed in looking at a colleague's report should still be able to reach their
 * own dashboard, and it tells them nothing about the report they are reading.
 *
 * `getCurrentUser` is `cache()`d, so the page asking the same question again costs nothing.
 */
export default async function ReportLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const user = await getCurrentUser()

  return (
    <I18nProvider value={{ locale, dictionary: dictionaryFor(locale) }}>
      {user && <Navbar />}
      <main className={cn(CONTAINER_CLASS, 'flex-1 py-8 sm:py-12')}>{children}</main>
      {user && <SiteFooter />}
    </I18nProvider>
  )
}
