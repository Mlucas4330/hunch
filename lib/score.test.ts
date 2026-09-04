import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readoutScore, scoreSeverity } from './score'
import { READOUT_SCORE_THRESHOLDS } from './constants'
import type { MeasuredFinding } from './readout'
import type { ReadoutGroup, ReadoutSeverity } from './enums'

let next = 0

function finding(group: ReadoutGroup, severity: ReadoutSeverity): MeasuredFinding {
  next += 1
  return { id: 'form_fields', group, severity, value: next, unit: 'count', criterion: null }
}

test('a group with nothing measured scores null, never zero', () => {
  const score = readoutScore([finding('structure', 'ok')])

  assert.equal(score.groups.structure, 100)
  assert.equal(score.groups.declared, null, 'nothing was measured, which is not the same as bad')
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

// **The regression that is easiest to cause and hardest to notice.** Nothing on screen says the
// score moved because a design choice was averaged into it; the number just drifts up, and every
// page measured before the group existed carries a different one for no stated reason.
test('sameness findings never move the overall score', () => {
  const base = [finding('structure', 'ok'), finding('load', 'alert')]
  const withMarks = [...base, finding('sameness', 'ok'), finding('sameness', 'ok')]

  assert.equal(readoutScore(withMarks).overall, readoutScore(base).overall)
})

test('an unscored group carries no group score either, so no rail renders for it', () => {
  const score = readoutScore([finding('structure', 'ok'), finding('sameness', 'ok')])

  assert.equal(score.groups.sameness, null)
  assert.equal(score.groups.structure, 100)
})
