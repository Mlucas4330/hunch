import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AnalysisOutputSchema,
  FlowFixSchema,
  HypothesisSchema,
  PlaybookOutputSchema,
  VisibilityFixSchema
} from './schema'

// The first tests of the AI layer. They exist for one reason: **every field here is filled by a
// model, and the two fix generators swallow a parse failure whole** -- `generatePlaybook` and
// `generateVisibility` both end in `catch -> return []`, so a single unacceptable value does not
// surface as an error, it surfaces as an empty tab. What degrades and what rejects is therefore a
// product decision, and these pin it.

const FIX = {
  category: 'signup_friction',
  title: 'Offer login with Google',
  problem: 'Signing up means inventing a password.',
  steps: ['Register an OAuth client', 'Add the button above the email field'],
  impact_score: 9,
  evidence: 'Every account created today costs the visitor a password.',
  finding: 'no_social_signin'
}

const HYPOTHESIS = {
  section: 'subheadline',
  current_copy: 'Built for teams that move fast',
  assessment: 'The subheadline restates the audience the headline already named.',
  problem: 'It leaves the setup question the visitor is about to ask unanswered.',
  variants: [
    {
      copy: 'Set up in [setup time]. No migration, no training.',
      evidence: 'The current line repeats the audience, and the rewrite answers the next objection.',
      emphasis: null
    }
  ],
  impact_score: 4,
  rationale: 'Handling the top objection where it appears keeps momentum toward the CTA.'
}

test('a fix carries the finding it answers', () => {
  const parsed = FlowFixSchema.parse(FIX)

  assert.equal(parsed.finding, 'no_social_signin')
})

test('null is a valid finding, because not every fix answers a measurement', () => {
  const parsed = FlowFixSchema.parse({ ...FIX, finding: null })

  assert.equal(parsed.finding, null)
})

test('an invented finding id degrades to null instead of rejecting the fix', () => {
  const parsed = FlowFixSchema.parse({ ...FIX, finding: 'the_form_is_too_long' })

  assert.equal(
    parsed.finding,
    null,
    'a hallucinated id costs one missing link, never the generation call that was already paid for'
  )
  assert.equal(parsed.title, FIX.title, 'the rest of the fix survives untouched')
})

test('a missing finding field degrades the same way', () => {
  const { finding, ...withoutFinding } = FIX
  void finding

  assert.equal(FlowFixSchema.parse(withoutFinding).finding, null)
})

test('one bad finding does not empty the whole playbook', () => {
  // The failure this guards against: both generators answer `[]` on a throw, so without `.catch`
  // one invented id would silently cost the reader every fix in the list.
  const parsed = PlaybookOutputSchema.parse({
    fixes: [
      { ...FIX, finding: 'form_fields' },
      { ...FIX, finding: 'not_a_real_finding' },
      { ...FIX, finding: 'no_faq' }
    ]
  })

  assert.equal(parsed.fixes.length, 3)
  assert.deepEqual(
    parsed.fixes.map((fix) => fix.finding),
    ['form_fields', null, 'no_faq']
  )
})

test('the category still rejects, because it decides which list a fix lands in', () => {
  // Deliberately not `.catch`ed, unlike `finding`. A wrong category files a fix under the wrong
  // heading, which is a visible lie about what was audited; a wrong finding just fails to link.
  assert.throws(() => FlowFixSchema.parse({ ...FIX, category: 'ai_answerability' }))
  assert.throws(() => VisibilityFixSchema.parse({ ...FIX, category: 'signup_friction' }))
})

// **The key order below is behaviour, not formatting.** A structured output is written in the order
// the fields are declared, so this order is what makes the model quote the line, judge it, and name
// the gap before a replacement exists to defend. Nothing at runtime would complain if someone sorted
// these alphabetically or moved `problem` back to the front, and the analysis would quietly go back
// to naming a defect before transcribing the line it is in. This test is the only thing that would.
test('a hypothesis is judged before it is rewritten, and the field order is what does it', () => {
  assert.deepEqual(Object.keys(HypothesisSchema.shape), [
    'section',
    'current_copy',
    'assessment',
    'problem',
    'variants',
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

// **No floor at all**, which is the rule and not an oversight: on a page whose lines are doing their
// job, a floor of one buys exactly one invented finding. It also has to hold for `resolveTargets`,
// which drops a hypothesis quoting a line that is on no element and can empty the list on its own.
// See the schema's own comment and docs/ai-pipeline.md.
test('no lines worth changing is a valid answer, and so is one', () => {
  assert.ok(AnalysisOutputSchema.safeParse({ hypotheses: [HYPOTHESIS] }).success)
  assert.ok(AnalysisOutputSchema.safeParse({ hypotheses: [] }).success)
})
