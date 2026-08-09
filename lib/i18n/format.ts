import type { Locale } from '@/lib/enums'

export type Plural = { one: string; other: string }

type Vars = Record<string, string | number>

export function t(entry: string | Plural, vars: Vars = {}): string {
  const template = typeof entry === 'string' ? entry : entry[vars.count === 1 ? 'one' : 'other']

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  )
}

export function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(locale)
}

export function formatDecimal(value: number, locale: Locale, digits: number): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
}
