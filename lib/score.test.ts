import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readoutScore, scoreSeverity } from './score'
import { READOUT_SCORE_THRESHOLDS } from './constants'
import type { MeasuredFinding } from './readout'
import type { ReadoutGroup, ReadoutSeverity } from './enums'

let next = 0

function finding(group: ReadoutGroup, severity: ReadoutSeverity): MeasuredFinding {
  next += 1
  return { id: 'form_fields', group, severity, value: next, unit: 'count' }
}

test('a group with nothing measured scores null, never zero', () => {
  const score = readoutScore([finding('structure', 'ok')])

  assert.equal(score.groups.structure, 100)
  assert.equal(score.groups.metadata, null, 'nothing was measured, which is not the same as bad')
  assert.equal(score.groups.load, null)
})

test('nothing measured at all scores null overall', () => {
  const score = readoutScore([])

  assert.equal(score.overall, null)
  assert.equal(score.groups.structure, null)
})

test('a warn is worth half a finding, not a failure', () => {
  assert.equal(readoutScore([finding('load', 'warn')]).overall, 50)
  assert.equal(readoutScore([finding('load', 'alert')]).overall, 0)
  assert.equal(readoutScore([finding('load', 'ok')]).overall, 100)
})

test('the overall weighs every finding equally, never every group equally', () => {
  const score = readoutScore([
    finding('structure', 'ok'),
    finding('structure', 'ok'),
    finding('structure', 'ok'),
    finding('load', 'alert')
  ])

  assert.equal(score.groups.structure, 100)
  assert.equal(score.groups.load, 0)
  assert.equal(
    score.overall,
    75,
    'a group holding one finding must not weigh as much as a group holding three'
  )
})

test('the score bands read downward, with the threshold on the bad side', () => {
  assert.equal(scoreSeverity(READOUT_SCORE_THRESHOLDS.warnAtOrBelow), 'warn')
  assert.equal(scoreSeverity(READOUT_SCORE_THRESHOLDS.warnAtOrBelow + 1), 'ok')
  assert.equal(scoreSeverity(READOUT_SCORE_THRESHOLDS.alertAtOrBelow), 'alert')
  assert.equal(scoreSeverity(100), 'ok')
  assert.equal(scoreSeverity(0), 'alert')
})
