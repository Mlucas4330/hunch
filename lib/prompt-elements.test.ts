import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_PROMPT_ELEMENTS, promptElements } from './prompt-elements'
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
