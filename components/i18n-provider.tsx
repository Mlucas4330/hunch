'use client'

import { createContext, useContext } from 'react'
import type { Locale } from '@/lib/enums'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

type I18n = { locale: Locale; dictionary: Dictionary }

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ value, children }: { value: I18n; children: React.ReactNode }) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
