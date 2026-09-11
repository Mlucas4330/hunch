import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analysisState, type AnalysisFacts } from './analysis-state'

const FACTS: AnalysisFacts = {
  measured: true,
  generated: false,
  owned: true,
  failed: false,
  running: false
}

const state = (overrides: Partial<AnalysisFacts>) => analysisState({ ...FACTS, ...overrides })

test('nothing measured yet is measuring while nothing has failed', () => {
  assert.equal(state({ measured: false }), 'measuring')
  assert.equal(state({ measured: false, running: true }), 'measuring')
})

test('a run that failed before anything was measured is failed, not measuring forever', () => {
  assert.equal(state({ measured: false, failed: true }), 'failed')
})

test('lists on screen are ready when no run is in flight', () => {
  assert.equal(state({ generated: true }), 'ready')
})

test('lists on screen with a new run in flight are rerunning', () => {
  assert.equal(state({ generated: true, running: true }), 'rerunning')
})

test('a new run that failed leaves the previous lists ready', () => {
  assert.equal(state({ generated: true, failed: true }), 'ready')
  assert.equal(state({ generated: true, failed: true, running: true }), 'ready')
})

test('a row from before the quota existed is ready once measured', () => {
  assert.equal(state({ owned: false }), 'ready')
  assert.equal(state({ owned: false, running: true }), 'ready')
})

test('a job in flight on an owned analysis with nothing generated is generating', () => {
  assert.equal(state({ running: true }), 'generating')
})

test('a recorded failure outranks a running job, because both are true while a failure unwinds', () => {
  assert.equal(state({ failed: true, running: true }), 'failed')
  assert.equal(state({ failed: true }), 'failed')
})

test('an owned run with nothing generated and no job is failed, not a placeholder that never fills', () => {
  assert.equal(state({}), 'failed')
})
