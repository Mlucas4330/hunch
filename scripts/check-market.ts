import { detectMarket } from '../lib/market'
import type { Market } from '../lib/enums'

// detectMarket is the only thing standing between a Brazilian product and an analysis benchmarked
// against American companies, and it is unreachable from the e2e suite -- E2E_FIXTURES=1 replaces the
// whole pipeline before a page is ever scraped. This script is its only automated coverage.
//
// The cases are chosen around the two directions of failure, which are not equally bad: missing a
// Brazilian page costs one unfocused competitor search, while marking a US page Brazilian rewrites
// the entire analysis around the wrong country.
const CASES: Array<{ url: string; lang: string | null; expected: Market; why: string }> = [
  {
    url: 'https://acme.com.br',
    lang: null,
    expected: 'br',
    why: 'the .br TLD decides on its own, with no lang declared'
  },
  {
    url: 'https://acme.app.br/precos',
    lang: 'en',
    expected: 'br',
    why: 'a .br TLD outranks an English lang attribute'
  },
  {
    url: 'https://acme.com',
    lang: 'pt-BR',
    expected: 'br',
    why: 'a Brazilian Portuguese page on a .com is a Brazilian product'
  },
  {
    url: 'https://acme.com',
    lang: 'PT-br',
    expected: 'br',
    why: 'the lang attribute is case insensitive'
  },
  {
    url: 'https://acme.com',
    lang: 'pt',
    expected: 'br',
    why: 'a bare pt matches the prefix'
  },
  {
    url: 'https://acme.com',
    lang: 'pt-PT',
    expected: 'us',
    why: 'Portugal is not this market, and it must survive the pt prefix match'
  },
  {
    url: 'https://acme.com',
    lang: 'en',
    expected: 'us',
    why: 'a plain US page stays on the default'
  },
  {
    url: 'https://acme.com',
    lang: null,
    expected: 'us',
    why: 'no signal at all falls back to the default rather than guessing'
  },
  {
    url: 'https://acme.com',
    lang: '',
    expected: 'us',
    why: 'an empty lang attribute is no signal, not a match'
  },
  {
    url: 'https://braintree.com',
    lang: 'en',
    expected: 'us',
    why: 'the TLD check must match the .br suffix, not the letters br anywhere in the host'
  },
  {
    url: 'not a url',
    lang: 'en',
    expected: 'us',
    why: 'an unparseable URL degrades to the default rather than throwing mid-analysis'
  }
]

function main() {
  let failures = 0

  for (const { url, lang, expected, why } of CASES) {
    const actual = detectMarket({ url, lang })
    const label = `${url} lang=${lang === null ? 'null' : `"${lang}"`}`
    if (actual === expected) {
      console.log(`ok    ${label} -> ${actual} (${why})`)
    } else {
      console.error(`FAIL  ${label} -> ${actual}, expected ${expected} (${why})`)
      failures++
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} market detection check(s) failed`)
    process.exit(1)
  }

  console.log(`\nAll ${CASES.length} market detection checks passed`)
}

main()
