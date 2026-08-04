import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE } from '@/lib/constants'
import { LOCALE, type Locale } from '@/lib/enums'
import { en, type Dictionary } from '@/lib/i18n/dictionaries/en'
import { ptBR } from '@/lib/i18n/dictionaries/pt-BR'

export type { Dictionary }

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  'pt-BR': ptBR
}

export function isLocale(value: unknown): value is Locale {
  return LOCALE.includes(value as Locale)
}

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaryFor(await getLocale())
}
