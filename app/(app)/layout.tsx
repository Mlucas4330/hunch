import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { I18nProvider } from '@/components/i18n-provider'
import { dictionaryFor, getLocale } from '@/lib/i18n'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <I18nProvider value={{ locale, dictionary: dictionaryFor(locale) }}>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <Footer />
    </I18nProvider>
  )
}
