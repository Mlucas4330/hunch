import { Footer } from '@/components/footer'
import { I18nProvider } from '@/components/i18n-provider'
import { dictionaryFor, getLocale } from '@/lib/i18n'

export default async function ReportLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <I18nProvider value={{ locale, dictionary: dictionaryFor(locale) }}>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">{children}</main>
      <Footer />
    </I18nProvider>
  )
}
