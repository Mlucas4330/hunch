import { Navbar } from '@/components/navbar'
import { SiteFooter } from '@/components/site-footer'
import { I18nProvider } from '@/components/i18n-provider'
import { ScrollReveal } from '@/components/scroll-reveal'
import { CONTAINER_CLASS } from '@/lib/constants'
import { dictionaryFor, getLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <I18nProvider value={{ locale, dictionary: dictionaryFor(locale) }}>
      <ScrollReveal />
      <Navbar />
      <main className={cn(CONTAINER_CLASS, 'flex-1 py-8')}>{children}</main>
      <SiteFooter />
    </I18nProvider>
  )
}
