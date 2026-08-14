import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractKeywords } from './keywords'
import { KEYWORD_MIN_COUNT, KEYWORD_TERMS_MAX } from './constants'

function repeat(phrase: string, times: number): string {
  return Array.from({ length: times }, () => phrase).join(' ')
}

function termsFor(text: string, overrides: Parameters<typeof extractKeywords>[0] | null = null) {
  return extractKeywords(
    overrides ?? { text, title: null, metaDescription: null, headings: [] }
  ).terms
}

test('a word said once is not a theme', () => {
  const terms = termsFor(`onboarding ${repeat('pricing', KEYWORD_MIN_COUNT)}`)

  assert.ok(
    terms.some((t) => t.term === 'pricing'),
    'repeated enough to count'
  )
  assert.equal(
    terms.find((t) => t.term === 'onboarding'),
    undefined
  )
})

test('stopwords are dropped in both languages, and accents survive', () => {
  const terms = termsFor(repeat('a página de preços para você', 3))
  const found = terms.map((t) => t.term)

  for (const stopword of ['a', 'de', 'para', 'você']) {
    assert.equal(found.includes(stopword), false, `${stopword} is a stopword on its own`)
  }

  assert.ok(found.includes('página'), 'and the accented word is kept exactly as written')
  assert.ok(found.includes('preços'))
})

test('a phrase never starts or ends on a stopword', () => {
  const terms = termsFor(repeat('the landing page for teams', 3)).map((t) => t.term)

  assert.ok(terms.includes('landing page'), 'a real two word term is kept')
  assert.equal(terms.includes('page for'), false, 'trailing stopword')
  assert.equal(terms.includes('for teams'), false, 'leading stopword')
})

test('a term is matched on whole words, never inside a longer one', () => {
  const keywords = extractKeywords({
    text: repeat('deploy', 3),
    title: 'Redeployment tooling',
    metaDescription: 'Deploy in one click',
    headings: []
  })
  const deploy = keywords.terms.find((t) => t.term === 'deploy')

  assert.equal(deploy?.inTitle, false, '"redeployment" is not the term "deploy"')
  assert.equal(deploy?.inMetaDescription, true)
})

test('where a term appears is reported per surface, and the first heading is the H1', () => {
  const keywords = extractKeywords({
    text: repeat('checkout flow', 4),
    title: 'Checkout for stores',
    metaDescription: null,
    headings: ['A faster checkout', 'Flow builder']
  })
  const checkout = keywords.terms.find((t) => t.term === 'checkout')

  assert.equal(checkout?.inTitle, true)
  assert.equal(checkout?.inH1, true)
  assert.equal(checkout?.inMetaDescription, false)
  assert.equal(checkout?.inHeadings, true)

  const flow = keywords.terms.find((t) => t.term === 'flow')

  assert.equal(flow?.inH1, false, 'the second heading is not the H1')
  assert.equal(flow?.inHeadings, true)
})

test('a page with nothing to read produces no terms rather than empty ones', () => {
  const keywords = extractKeywords({ text: '', title: null, metaDescription: null, headings: [] })

  assert.deepEqual(keywords.terms, [])
  assert.equal(keywords.totalWords, 0)
})

test('the table is capped and ordered by how often the page says it', () => {
  const text = Array.from({ length: KEYWORD_TERMS_MAX + 6 }, (_, i) =>
    repeat(`term${i}`, KEYWORD_TERMS_MAX + 8 - i)
  ).join(' ')
  const terms = termsFor(text)

  assert.equal(terms.length, KEYWORD_TERMS_MAX)
  assert.equal(terms[0].term, 'term0')
  assert.ok(terms[0].count > terms[1].count)
})
