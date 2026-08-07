import { I18nProvider } from '@/components/i18n-provider'
import { dictionaryFor, getLocale } from '@/lib/i18n'

// Deliberately mounts no Footer. It carries a personal "powered by" credit, and a paid owner's report
// is a document they hand to their own client -- so whether it renders is a per-report decision the
// page makes from the owner's plan. This layout sits above the [embedKey] segment and cannot know.
export default async function ReportLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <I18nProvider value={{ locale, dictionary: dictionaryFor(locale) }}>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">{children}</main>
    </I18nProvider>
  )
}
