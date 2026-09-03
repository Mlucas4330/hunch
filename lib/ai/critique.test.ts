import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyCritique, critiqueInput } from './critique'
import type { HypothesisOutput } from './schema'

function hypothesis(copy: string): HypothesisOutput {
  return {
    section: 'headline',
    current_copy: copy,
    assessment: 'It names the audience.',
    problem: 'It names the category instead of the outcome.',
    variants: [{ copy: `${copy} rewritten`, evidence: 'It states the outcome.', emphasis: null }],
    impact_score: 7,
    rationale: 'The replacement states what the current line leaves implied.'
  }
}

const SET = [hypothesis('one'), hypothesis('two'), hypothesis('three')]

test('an index drops the rewrite it names, and the rest survive', () => {
  const { kept, dropped } = applyCritique(SET, { drop: [{ index: 2, reason: 'Same thing, reworded.' }] })

  assert.deepEqual(kept.map((h) => h.current_copy), ['one', 'three'])
  assert.deepEqual(dropped, [{ copy: 'two', reason: 'Same thing, reworded.' }])
})

// Silence is agreement, which is what makes a truncated answer cost nothing.
test('a rewrite the critic says nothing about is kept', () => {
  assert.equal(applyCritique(SET, { drop: [] }).kept.length, 3)
})

// A 0 or a 4 shifting the list by one would delete a rewrite the critic never judged.
test('an index naming no rewrite deletes nothing', () => {
  const { kept } = applyCritique(SET, {
    drop: [
      { index: 0, reason: 'off the front' },
      { index: 4, reason: 'off the end' },
      { index: -1, reason: 'nonsense' }
    ]
  })

  assert.equal(kept.length, 3)
})

test('the same index twice is still one rewrite dropped', () => {
  const { kept, dropped } = applyCritique(SET, {
    drop: [
      { index: 1, reason: 'first call' },
      { index: 1, reason: 'second call' }
    ]
  })

  assert.equal(kept.length, 2)
  assert.equal(dropped.length, 1)
})

// The critic can empty the list, and that is allowed: an analysis with no copy findings already
// renders, and the refund only fires when all three generations came back with nothing.
test('dropping everything is permitted rather than clamped', () => {
  const { kept } = applyCritique(SET, {
    drop: [1, 2, 3].map((index) => ({ index, reason: 'none of these were needed' }))
  })

  assert.equal(kept.length, 0)
})

test('what the critic reads is numbered from one and carries no field it could edit', () => {
  const input = critiqueInput(SET)

  assert.ok(input.startsWith('1. [headline]'))
  assert.ok(input.includes('3. [headline]'))
  assert.ok(input.includes('current: two'))
  assert.ok(input.includes('proposed: two rewritten'))
  // The impact score is deliberately absent: a critic shown a 9 argues with the number instead of
  // with the line, and it cannot change it either way.
  assert.ok(!input.includes('impact'))
})
