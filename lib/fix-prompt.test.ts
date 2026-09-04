import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixPrompt } from './fix-prompt'
import { en } from './i18n/dictionaries/en'
import type { FlowFix, Hypothesis, Variant } from '@/db/schema'

// Only the fields `fixPrompt` reads. Casting keeps the fixtures to what is under test rather than
// to every column the tables carry.
const FIX = {
  category: 'signup_friction',
  title: 'Cut the form from seven fields to three',
  problem: 'Visitors give up before they reach anything worth having.',
  steps: ['Remove phone, company and job title', 'Move the rest onto one screen'],
  verdict: null
} as unknown as FlowFix

function decided(verdict: 'applied' | 'dismissed'): FlowFix {
  return { ...FIX, verdict } as unknown as FlowFix
}

function hypothesis(
  currentCopy: string,
  variants: Partial<Variant>[],
  verdict: 'applied' | 'dismissed' | null = null
) {
  return {
    section: 'headline',
    currentCopy,
    verdict,
    variants: variants as Variant[]
  } as unknown as Hypothesis & { variants: Variant[] }
}

function build(
  hypotheses: (Hypothesis & { variants: Variant[] })[],
  flowFixes: FlowFix[] = []
): string | null {
  return fixPrompt({
    url: 'https://example.com',
    hypotheses,
    flowFixes,
    dictionary: en
  })
}

test('an analysis with nothing generated produces no prompt at all', () => {
  assert.equal(build([], []), null)
})

test('a structural fix arrives with its steps under a numbered heading', () => {
  const prompt = build([], [FIX])

  assert.ok(prompt?.includes('Cut the form from seven fields to three'))
  assert.ok(prompt?.includes('Remove phone, company and job title'))
  assert.ok(prompt?.includes('https://example.com'))
})

// **The line being replaced has to travel with the replacement.** A model given only the new text
// picks the old one that looked closest, which is how a rewrite lands on the wrong element.
test('a rewrite carries the line it replaces, quoted', () => {
  const prompt = build([hypothesis('Welcome to our platform', [{ copy: 'Send your first invoice in two minutes', author: 'model' }])])

  assert.ok(prompt?.includes('"Welcome to our platform"'))
  assert.ok(prompt?.includes('"Send your first invoice in two minutes"'))
})

// An owner's own line is the one thing on a report that was never generated, and it is what they
// actually shipped. Handing their tool the model's draft instead would undo their edit.
test('the owner own line wins over the model draft', () => {
  const prompt = build([
    hypothesis('Welcome', [
      { copy: 'What the model wrote', author: 'model' },
      { copy: 'What the owner published', author: 'owner' }
    ])
  ])

  assert.ok(prompt?.includes('What the owner published'))
  assert.ok(!prompt?.includes('What the model wrote'))
})

// **The rule this whole feature is riskiest without.** A replacement carrying [brackets] is
// deliberately unfinished; a model handed one with no instruction fills it with something plausible
// and false, on a page that is already live.
test('a bracketed replacement adds the do-not-invent rule', () => {
  const prompt = build([hypothesis('Welcome', [{ copy: 'Trusted by [number] teams', author: 'model' }])])

  assert.ok(prompt?.includes(en.fixPrompt.placeholderRule))
  assert.ok(prompt?.includes(en.fixPrompt.placeholderNote))
})

test('a finished replacement does not carry the placeholder rule', () => {
  const prompt = build([hypothesis('Welcome', [{ copy: 'Send your first invoice today', author: 'model' }])])

  assert.ok(!prompt?.includes(en.fixPrompt.placeholderRule))
})

// A hypothesis whose variants never arrived is a row with nothing to say. It must not become an
// instruction to replace a line with nothing.
test('a hypothesis with no variant is skipped rather than half written', () => {
  const prompt = build([hypothesis('Welcome', [])], [FIX])

  assert.ok(prompt?.includes('Cut the form from seven fields to three'))
  assert.ok(!prompt?.includes('"Welcome"'))
})

// Nothing in the prompt may point back at the report: `embed_key` is the only credential it has, and
// this text is going into somebody else's model.
test('the prompt never carries a report link', () => {
  const prompt = build([hypothesis('Welcome', [{ copy: 'Ship today', author: 'model' }])], [FIX])

  assert.ok(!prompt?.includes('/r/'))
})

// **What the owner already decided is left out, and the two reasons are different.**

test('a fix marked applied is left out, because repeating it asks for the work twice', () => {
  const prompt = build([], [decided('applied')])

  assert.equal(prompt, null)
})

test('a fix marked dismissed is left out, because the owner ruled against it', () => {
  const prompt = build([], [decided('dismissed')])

  assert.equal(prompt, null)
})

test('an undecided fix stays, because null is nobody having ruled yet', () => {
  const prompt = build([], [FIX])

  assert.ok(prompt?.includes('Cut the form from seven fields to three'))
})

test('a decided rewrite drops out while its undecided neighbour stays', () => {
  const prompt = build([
    hypothesis('Already shipped', [{ copy: 'New line one', author: 'model' }], 'applied'),
    hypothesis('Still open', [{ copy: 'New line two', author: 'model' }])
  ])

  assert.ok(!prompt?.includes('Already shipped'))
  assert.ok(prompt?.includes('Still open'))
})

// The whole report decided means there is nothing left to instruct, and the card must disappear
// rather than offer an empty prompt with only rules in it.
test('a report where everything is decided produces no prompt', () => {
  const prompt = build(
    [hypothesis('Done', [{ copy: 'Shipped', author: 'owner' }], 'applied')],
    [decided('applied')]
  )

  assert.equal(prompt, null)
})
