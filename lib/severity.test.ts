import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ERROR_SEVERITY_BADGE_CLASS,
  ERROR_SEVERITY_RAIL_CLASS,
  IMPACT_SCORE_MAX,
  IMPACT_SCORE_MIN,
  impactScoreBadgeClass,
  impactScoreRailClass,
  severityForImpact
} from './constants'
import { ERROR_SEVERITY } from './enums'

// The word on the badge and the colour on the rail are one decision read twice. These pin the cut
// points, and that the two readings can never disagree.

test('the scale is cut at eight and at five', () => {
  assert.equal(severityForImpact(10), 'critical')
  assert.equal(severityForImpact(8), 'critical')
  assert.equal(severityForImpact(7), 'medium')
  assert.equal(severityForImpact(5), 'medium')
  assert.equal(severityForImpact(4), 'low')
  assert.equal(severityForImpact(1), 'low')
})

test('every score the schemas allow has a severity', () => {
  for (let score = IMPACT_SCORE_MIN; score <= IMPACT_SCORE_MAX; score += 1) {
    assert.ok(ERROR_SEVERITY.includes(severityForImpact(score)), `no severity for ${score}`)
  }
})

test('the badge and the rail agree with the label at every score', () => {
  for (let score = IMPACT_SCORE_MIN; score <= IMPACT_SCORE_MAX; score += 1) {
    const severity = severityForImpact(score)

    assert.equal(impactScoreBadgeClass(score), ERROR_SEVERITY_BADGE_CLASS[severity])
    assert.equal(impactScoreRailClass(score), ERROR_SEVERITY_RAIL_CLASS[severity])
  }
})
