import { DEFAULT_MARKET, MARKET_SIGNALS } from '@/lib/constants'
import type { Market } from '@/lib/enums'

export interface MarketInput {
  url: string
  lang: string | null
}

export function detectMarket(input: MarketInput): Market {
  const host = hostnameOf(input.url)
  const lang = (input.lang ?? '').trim().toLowerCase()

  for (const [market, signals] of Object.entries(MARKET_SIGNALS)) {
    if (host !== null && signals.tlds.some((tld) => host.endsWith(tld))) return market as Market

    if (
      lang.length > 0 &&
      !signals.langExceptions.includes(lang) &&
      signals.langPrefixes.some((prefix) => lang === prefix || lang.startsWith(`${prefix}-`))
    ) {
      return market as Market
    }
  }

  return DEFAULT_MARKET
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}
