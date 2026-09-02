import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analysisState, type AnalysisFacts } from './analysis-state'

const FACTS: AnalysisFacts = {
  measured: true,
  generated: false,
  owned: true,
  running: false,
  refunded: false
}

const state = (overrides: Partial<AnalysisFacts>) => analysisState({ ...FACTS, ...overrides })

test('nothing measured yet is measuring, whatever else is true of the row', () => {
  assert.equal(state({ measured: false }), 'measuring')
  assert.equal(state({ measured: false, owned: false }), 'measuring')
  assert.equal(state({ measured: false, running: true }), 'measuring')
})

test('anything generated is ready, and no job or ledger read can change that', () => {
  assert.equal(state({ generated: true }), 'ready')
  assert.equal(state({ generated: true, refunded: true }), 'ready')
  assert.equal(state({ generated: true, running: true }), 'ready')
})

// The window this closes: an anonymous run commits its measurement and returns, and the queue writes
// the job's terminal status a moment later -- so the job still says `running` exactly when the form
// navigates the reader here. See lib/analysis-state.ts.
test('an ownerless run is never generating, however alive its job looks', () => {
  assert.equal(state({ owned: false, running: true }), 'locked')
  assert.equal(state({ owned: false }), 'locked')
})

test('a job in flight on an owned analysis is generating', () => {
  assert.equal(state({ running: true }), 'generating')
})

// `refundCredit` commits before `runAnalysis` rethrows, and the queue writes `unavailable` only after
// that -- so both flags are true for the length of the gap, and for any retry after it.
test('a refund outranks a running job, because both are true while a failure unwinds', () => {
  assert.equal(state({ refunded: true, running: true }), 'failed')
  assert.equal(state({ refunded: true }), 'failed')
})

test('owned, measured, and nothing happening is a claimed free run', () => {
  assert.equal(state({}), 'locked')
})

// Redis unreachable means no job, so `running` is false on an analysis that is genuinely still
// working. The wall is recoverable by reloading; a placeholder that never fills is not.
test('a generation nobody can see the job for reads as locked rather than as generating', () => {
  assert.equal(state({ running: false }), 'locked')
})
