import { DEFAULT_MARKET, MARKET_SIGNALS } from '@/lib/constants'
import type { Market } from '@/lib/enums'

export interface MarketInput {
  // The analyzed page's own URL, for its TLD.
  url: string
  // The page's <html lang>, as captured by the SEO readout. Null when the page declares none.
  lang: string | null
}

// Which market a landing page sells into. Pure: no DOM, no network, no clock -- so
// lib/market.test.ts can assert it without a browser, the same reason lib/url-guard.ts is its
// own module.
//
// Only two signals, and both are decisive on their own: nobody registers a .com.br to sell in the US,
// and a page written in Brazilian Portuguese is a Brazilian product. Weaker signals were considered
// and left out rather than blended in -- a BRL price, for instance, appears on plenty of global
// pricing tables that do not treat Brazil as a market.
//
// That makes the detection deliberately lossy in one direction: a Brazilian product on a .com writing
// in English reads as `us` and gets the generic search it already gets today. The asymmetry runs the
// same way as PageStructure's, and for the same reason -- a false negative costs one unfocused
// competitor search, while a false positive benchmarks a US product against the wrong country and
// gives the reader nothing to explain why.
export function detectMarket(input: MarketInput): Market {
  const host = hostnameOf(input.url)
  const lang = (input.lang ?? '').trim().toLowerCase()

  for (const [market, signals] of Object.entries(MARKET_SIGNALS)) {
    if (host !== null && signals.tlds.some((tld) => host.endsWith(tld))) return market as Market

    // Prefix match, so `pt` covers `pt-BR`, minus the exceptions -- `pt-PT` is Portuguese, not this
    // market, and a prefix match alone cannot tell the two apart.
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
