import { test } from 'node:test'
import assert from 'node:assert/strict'
import { roundsLeft } from './variant-rounds'
import { ALTERNATES_PER_ROUND, VARIANT_ROUNDS_MAX } from './constants'

const model = (count: number) => Array.from({ length: count }, () => ({ author: 'model' }))
const owner = { author: 'owner' }

test('a fresh hypothesis has every round available', () => {
  assert.equal(roundsLeft(model(1)), VARIANT_ROUNDS_MAX)
})

test('each round spent is one fewer', () => {
  assert.equal(roundsLeft(model(1 + ALTERNATES_PER_ROUND)), VARIANT_ROUNDS_MAX - 1)
  assert.equal(roundsLeft(model(1 + ALTERNATES_PER_ROUND * 2)), VARIANT_ROUNDS_MAX - 2)
})

test('the cap is the cap, and it never goes negative', () => {
  assert.equal(roundsLeft(model(1 + ALTERNATES_PER_ROUND * VARIANT_ROUNDS_MAX)), 0)
  assert.equal(roundsLeft(model(50)), 0)
})

// The whole reason this is counted over authorship: writing your own line is not asking the model
// for another one, and charging a round for it would punish the thing we most want people to do.
test("the owner's own lines cost no rounds", () => {
  assert.equal(roundsLeft([...model(1), owner]), VARIANT_ROUNDS_MAX)
  assert.equal(roundsLeft([...model(1), owner, owner, owner]), VARIANT_ROUNDS_MAX)
  assert.equal(roundsLeft([...model(1 + ALTERNATES_PER_ROUND), owner]), VARIANT_ROUNDS_MAX - 1)
})

test('a hypothesis with no lines at all is not a spent one', () => {
  assert.equal(roundsLeft([]), VARIANT_ROUNDS_MAX)
  assert.equal(roundsLeft([owner]), VARIANT_ROUNDS_MAX)
})
