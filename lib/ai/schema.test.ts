import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AnalysisOutputSchema,
  FlowFixSchema,
  HypothesisSchema,
  PlaybookOutputSchema,
  VisibilityFixSchema
} from './schema'

// Every field here is filled by a model, and the generators swallow a parse failure whole: a single
// unacceptable value does not surface as an error, it surfaces as an empty list. What degrades and
// what rejects is therefore a product decision, and these pin it.

const FIX = {
  category: 'signup_friction',
  title: 'No way to sign in with Google',
  problem: 'Signing up means inventing a password.',
  impact_score: 9,
  evidence: 'Every account created today costs the visitor a password.',
  finding: 'no_social_signin'
}

const HYPOTHESIS = {
  section: 'subheadline',
  current_copy: 'Built for teams that move fast',
  assessment: 'The subheadline restates the audience the headline already named.',
  problem: 'It leaves the setup question the visitor is about to ask unanswered.',
  impact_score: 4,
  rationale: 'The space under the headline says nothing the visitor has not already read.'
}

test('an error carries the finding or audit it answers', () => {
  assert.equal(FlowFixSchema.parse(FIX).finding, 'no_social_signin')
  assert.equal(FlowFixSchema.parse({ ...FIX, finding: 'largest-contentful-paint' }).finding, 'largest-contentful-paint')
})

test('null is a valid finding, because not every error answers a measurement', () => {
  assert.equal(FlowFixSchema.parse({ ...FIX, finding: null }).finding, null)
})

test('a malformed finding degrades to null instead of rejecting the error', () => {
  const parsed = FlowFixSchema.parse({ ...FIX, finding: 42 })

  assert.equal(parsed.finding, null)
  assert.equal(parsed.title, FIX.title, 'the rest of the error survives untouched')
})

test('a missing finding field degrades the same way', () => {
  const { finding, ...withoutFinding } = FIX
  void finding

  assert.equal(FlowFixSchema.parse(withoutFinding).finding, null)
})

test('an error carries no steps, because the product points out errors and never writes the fix', () => {
  assert.equal('steps' in FlowFixSchema.parse({ ...FIX, steps: ['do this'] }), false)
})

test('one bad finding does not empty the whole playbook', () => {
  const parsed = PlaybookOutputSchema.parse({
    fixes: [
      { ...FIX, finding: 'form_fields' },
      { ...FIX, finding: 7 },
      { ...FIX, finding: 'no_faq' }
    ]
  })

  assert.deepEqual(
    parsed.fixes.map((fix) => fix.finding),
    ['form_fields', null, 'no_faq']
  )
})

test('the category still rejects, because it decides which list an error lands in', () => {
  assert.throws(() => FlowFixSchema.parse({ ...FIX, category: 'ai_answerability' }))
  assert.throws(() => VisibilityFixSchema.parse({ ...FIX, category: 'signup_friction' }))
})

// The key order is behaviour: a structured output is written in declaration order, so this is what
// makes the model quote the line and judge it before naming the error.
test('a line is quoted and judged before its error is named', () => {
  assert.deepEqual(Object.keys(HypothesisSchema.shape), [
    'section',
    'current_copy',
    'assessment',
    'problem',
    'impact_score',
    'rationale'
  ])
})

test('assessment is required, because a verdict left to the instructions cannot be checked', () => {
  const { assessment, ...withoutVerdict } = HYPOTHESIS

  assert.ok(HypothesisSchema.safeParse(HYPOTHESIS).success)
  assert.equal(HypothesisSchema.safeParse(withoutVerdict).success, false)
  assert.equal(assessment.length > 0, true)
})

test('no failing lines is a valid answer, and so is one', () => {
  assert.ok(AnalysisOutputSchema.safeParse({ hypotheses: [HYPOTHESIS] }).success)
  assert.ok(AnalysisOutputSchema.safeParse({ hypotheses: [] }).success)
})
