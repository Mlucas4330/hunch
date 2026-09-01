import Link from 'next/link'
import { ErrorScreen } from '@/components/error-screen'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/navbar'
import { SiteFooter } from '@/components/site-footer'
import { I18nProvider } from '@/components/i18n-provider'
import { CONTAINER_CLASS } from '@/lib/constants'
import { dictionaryFor, getLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * There was no 404 screen at all before this, on a product whose central artifact is a long opaque
 * URL that people paste into chat clients. A truncated report link -- the single most likely wrong
 * address anyone types here -- rendered Next's stock black-on-white page, with no wordmark, no
 * navigation and no way back.
 *
 * **It builds its own chrome rather than inheriting a layout.** `not-found.tsx` at the app root is
 * rendered inside `app/layout.tsx` only, so neither route group's layout runs and neither the navbar
 * nor the i18n provider exists here. Both are mounted explicitly, which is also why this file is a
 * server component: it can await the dictionary, and a `notFound()` from anywhere lands on it.
 */
export default async function NotFound() {
  const locale = await getLocale()
  const t = dictionaryFor(locale)

  return (
    <I18nProvider value={{ locale, dictionary: t }}>
      <Navbar />
      <main className={cn(CONTAINER_CLASS, 'flex-1 py-8')}>
        <ErrorScreen
          title={t.errors.notFound.title}
          body={t.errors.notFound.body}
          action={
            <Button asChild>
              <Link href="/">{t.errors.notFound.home}</Link>
            </Button>
          }
        />
      </main>
      <SiteFooter />
    </I18nProvider>
  )
}
