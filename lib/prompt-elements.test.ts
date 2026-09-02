import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_PROMPT_ELEMENTS, promptElements, resolveTarget } from './prompt-elements'
import type { PageElement } from './scrape'

function element(tag: string, text: string): PageElement {
  return { tag, text, selector: `${tag}#${text}`, capacity: 100, emphasized: false }
}

// A long page: body copy for the whole quota and then some, with the closing call to action and the
// final heading right at the end, where a plain slice off the front could never reach them.
function longPage(): PageElement[] {
  const body = Array.from({ length: MAX_PROMPT_ELEMENTS * 3 }, (_, i) =>
    element('p', `paragraph ${i}`)
  )
  return [
    element('h1', 'Hero headline'),
    ...body,
    element('h2', 'Pricing'),
    element('a', 'Start free trial')
  ]
}

test('the closing call to action survives a page longer than the quota', () => {
  const chosen = promptElements(longPage()).map((e) => e.text)

  assert.equal(chosen.length, MAX_PROMPT_ELEMENTS)
  assert.ok(chosen.includes('Start free trial'), 'the last CTA is reachable for a variant')
  assert.ok(chosen.includes('Pricing'))
  assert.ok(chosen.includes('Hero headline'))
})

test('what survives is still handed over in document order', () => {
  const page = longPage()
  const chosen = promptElements(page)
  const positions = chosen.map((e) => page.findIndex((candidate) => candidate.text === e.text))

  assert.deepEqual(
    positions,
    [...positions].sort((a, b) => a - b),
    'priority decides what is kept, never the order the model reads it in'
  )
})

test('a page inside the quota is passed through untouched', () => {
  const page = [element('h1', 'Hero'), element('p', 'Body'), element('a', 'Go')]

  assert.deepEqual(promptElements(page), page)
})

test('body copy still fills whatever the headings and controls leave', () => {
  const chosen = promptElements(longPage())

  assert.ok(
    chosen.some((e) => e.tag === 'p'),
    'the quota is not spent entirely on structure'
  )
})

// The return trip. **`found` is the whole point of these**: three of the five cases below resolve to
// `manual`, and only one of them is a quote of a line that is not on the page. Collapsing them was
// how a sentence a model wrote reached the reader struck through as their own copy.
const PAGE = [
  element('h1', 'Ship faster'),
  element('p', 'Built for teams that move fast'),
  element('a', 'Get started'),
  element('button', 'Get started')
]

test('a line carried by exactly one element can be swapped automatically', () => {
  const resolved = resolveTarget('Ship faster', PAGE)

  assert.equal(resolved.found, true)
  assert.equal(resolved.mode, 'auto')
  assert.equal(resolved.selector, 'h1#Ship faster')
})

test('whitespace and case are transcription noise, not a different line', () => {
  assert.equal(resolveTarget('  ship   FASTER ', PAGE).mode, 'auto')
})

// The link and the button say the same thing. The line is real, so the card stays; there is just no
// way to know which of the two the reader meant, so nothing is pointed at.
test('a line the page says twice is found, and still cannot be pointed at', () => {
  const resolved = resolveTarget('Get started', PAGE)

  assert.equal(resolved.found, true)
  assert.equal(resolved.mode, 'manual')
  assert.equal(resolved.selector, null)
})

test('a near quote resolves to the element it was taken from', () => {
  const resolved = resolveTarget('for teams that move fast', PAGE)

  assert.equal(resolved.found, true)
  assert.equal(resolved.mode, 'auto')
  assert.equal(resolved.text, 'Built for teams that move fast')
})

// Four words quoted off a six word line. Too far apart to swap without guessing what the reader
// meant, and unmistakably a quote of a line that is on the page: `found` and `mode` have to be able
// to disagree here, or the card is deleted over a partial transcription.
test('a fragment too short to swap is still a line the page carries', () => {
  const resolved = resolveTarget('teams that move fast', PAGE)

  assert.equal(resolved.found, true)
  assert.equal(resolved.mode, 'manual')
})

test('a line on no element is not found, and lib/analyze.ts drops the card', () => {
  const resolved = resolveTarget('The all-in-one platform for modern teams', PAGE)

  assert.equal(resolved.found, false)
  assert.equal(resolved.mode, 'manual')
})

test('an empty quote is not found either, rather than matching everything', () => {
  assert.equal(resolveTarget('   ', PAGE).found, false)
})
