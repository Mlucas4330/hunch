import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composePageText, coverageNote } from './page-text'
import { PROMPT_SECTIONS_KEEP_TAIL } from './constants'

function section(heading: string, size: number) {
  return { heading, text: 'x'.repeat(size) }
}

test('a page that fits is passed through whole, with nothing to declare', () => {
  const composed = composePageText({
    sections: [section('Hero', 10), section('Pricing', 10)],
    fallback: '',
    budget: 1000
  })

  assert.equal(composed.truncated, false)
  assert.deepEqual(composed.omitted, [])
  assert.ok(composed.text.includes('Hero'))
  assert.ok(composed.text.includes('Pricing'))
  assert.equal(coverageNote(composed), '', 'no note on a page that arrived intact')
})

test('the middle is dropped, never the pricing at the end', () => {
  const sections = [
    section('Hero', 100),
    section('Features', 100),
    section('Logos', 100),
    section('Testimonials', 100),
    section('Pricing', 100),
    section('FAQ', 100),
    section('Final CTA', 100)
  ]

  const composed = composePageText({ sections, fallback: '', budget: 480 })

  assert.ok(composed.truncated)
  assert.ok(composed.text.includes('Hero'), 'the opening argues and is kept')
  for (const tail of ['Pricing', 'FAQ', 'Final CTA']) {
    assert.ok(composed.text.includes(tail), `${tail} is in the last ${PROMPT_SECTIONS_KEEP_TAIL}`)
  }
  assert.ok(composed.omitted.length > 0, 'something had to go')
  assert.ok(
    composed.omitted.every((heading) => ['Features', 'Logos', 'Testimonials'].includes(heading)),
    'and it came from the middle'
  )
})

test('the sections left out are named, and the note forbids concluding from their absence', () => {
  const composed = composePageText({
    sections: [
      section('Hero', 100),
      section('Features', 100),
      section('Logos', 100),
      section('Pricing', 100),
      section('FAQ', 100),
      section('Final CTA', 100)
    ],
    fallback: '',
    budget: 480
  })
  const note = coverageNote(composed)

  assert.ok(composed.omitted.length > 0)
  for (const heading of composed.omitted) {
    assert.ok(note.includes(heading), `${heading} is named so the model knows what it lost`)
  }
  assert.ok(note.includes('Never state that the page lacks something you were not shown'))
})

test('a section with no heading is still declared, rather than dropped silently', () => {
  const composed = composePageText({
    sections: [
      section('Hero', 100),
      { heading: null, text: 'y'.repeat(100) },
      section('Pricing', 100)
    ],
    fallback: '',
    budget: 230
  })

  assert.equal(composed.omitted.length, 1)
  assert.ok(coverageNote(composed).includes(composed.omitted[0]))
})

test('a page measured before sections existed falls back to a flat cut, and says so', () => {
  const composed = composePageText({ fallback: 'z'.repeat(500), budget: 100 })

  assert.equal(composed.text.length, 100)
  assert.ok(composed.truncated)
  assert.deepEqual(composed.omitted, [], 'nothing structured to name')
  assert.ok(coverageNote(composed).includes('cut short'))
})

test('one section larger than the budget is cut rather than producing an empty prompt', () => {
  const composed = composePageText({
    sections: [section('Everything', 5000)],
    fallback: '',
    budget: 100
  })

  assert.equal(composed.text.length, 100)
  assert.ok(composed.truncated)
})
