import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EMPTY_BRIEF, briefIsComplete, briefIsEmpty, composeBrief, parseBrief } from './brief'

test('a composed brief reads back as the fields that made it', () => {
  const parts = {
    audience: 'Solo founders shipping their first paid product',
    offer: 'A landing page teardown for 19 reais',
    action: 'Paste a URL',
    objection: 'They think it is another generic AI audit'
  }

  assert.deepEqual(parseBrief(composeBrief(parts)), parts)
})

test('an unanswered field is left out rather than emitted empty', () => {
  const brief = composeBrief({ ...EMPTY_BRIEF, offer: 'One credit, one full analysis' })

  assert.equal(brief, 'Offer: One credit, one full analysis')
  assert.ok(!brief.includes('Objection'))
})

test('a brief written before the form had fields survives whole', () => {
  const legacy = 'We sell a CRM to dentists in Brazil.\nTrial is 14 days, no card.'

  assert.deepEqual(parseBrief(legacy), { ...EMPTY_BRIEF, audience: legacy })
})

test('a wrapped answer keeps its later lines', () => {
  const parts = parseBrief('Offer: A teardown\nwith the copy already written\nAction: Paste a URL')

  assert.equal(parts.offer, 'A teardown\nwith the copy already written')
  assert.equal(parts.action, 'Paste a URL')
})

test('a label inside an answer is prose, not the next field', () => {
  const parts = parseBrief('Audience: founders who ask "Offer: what exactly?" before buying')

  assert.equal(parts.audience, 'founders who ask "Offer: what exactly?" before buying')
  assert.equal(parts.offer, '')
})

test('nothing typed is nothing stored', () => {
  assert.ok(briefIsEmpty(parseBrief('   \n  ')))
  assert.equal(composeBrief(EMPTY_BRIEF), '')
})

// The credit is spent on all four or on none. A legacy brief lands whole in `audience`, so it is
// three questions short however much business detail it carries, and the reader is asked them.
test('a credit is only spent when all four questions have answers', () => {
  const full = {
    audience: 'Paid traffic freelancers',
    offer: 'One credit, one analysis',
    action: 'Buy a credit',
    objection: 'They cannot tell it apart from asking an AI'
  }

  assert.equal(briefIsComplete(full), true)
  assert.equal(briefIsComplete({ ...full, objection: '   ' }), false)
  assert.equal(briefIsComplete(EMPTY_BRIEF), false)
  assert.equal(briefIsComplete(parseBrief('We sell a CRM to dentists in Brazil.')), false)
})
