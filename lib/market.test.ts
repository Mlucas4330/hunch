import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectMarket } from './market'
import type { Market } from './enums'

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

for (const { url, lang, expected, why } of CASES) {
  const label = `${url} lang=${lang === null ? 'null' : `"${lang}"`}`
  test(`${label} -> ${expected}: ${why}`, () => {
    assert.equal(detectMarket({ url, lang }), expected)
  })
}
