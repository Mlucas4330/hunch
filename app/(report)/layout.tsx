import { I18nProvider } from '@/components/i18n-provider'
import { CONTAINER_CLASS } from '@/lib/constants'
import { dictionaryFor, getLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export default async function ReportLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <I18nProvider value={{ locale, dictionary: dictionaryFor(locale) }}>
      <main className={cn(CONTAINER_CLASS, 'flex-1 py-8 sm:py-12')}>{children}</main>
    </I18nProvider>
  )
}
