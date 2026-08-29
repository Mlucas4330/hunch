import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AdIdeasSchema, FlowFixSchema, PlaybookOutputSchema, VisibilityFixSchema } from './schema'
import { AD_DESCRIPTION_MAX_CHARS, AD_HEADLINE_MAX_CHARS } from '@/lib/constants'

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

// The ad ideas are the one generator whose ceilings are somebody else's: a headline past
// AD_HEADLINE_MAX_CHARS is rejected by Google at upload, so letting one through would hand the
// reader copy they cannot use. `generateAdIdeas` answers null on a throw, which is why rejecting is
// the right call here and degrading is not -- an empty section with a retry beats a set of headlines
// that half work. See docs/ads.md.

const AD_GROUP = {
  theme: 'Workspace for teams',
  terms: ['workspace', 'teams'],
  headlines: [
    'One workspace for teams',
    'Your team, one workspace',
    'Built for modern teams',
    'Start your workspace free',
    'A workspace teams keep'
  ],
  descriptions: [
    'One workspace where your team plans, writes and ships without switching tools.',
    'Set up in minutes. No card to start, and your team can join the same day.'
  ]
}

const AD_IDEAS = { groups: [AD_GROUP, AD_GROUP], negatives: ['course', 'jobs'] }

test('ad ideas parse when every line fits the ceilings Google enforces', () => {
  const parsed = AdIdeasSchema.parse(AD_IDEAS)

  assert.equal(parsed.groups.length, 2)
  assert.deepEqual(parsed.negatives, ['course', 'jobs'])
})

test('a headline past the character ceiling rejects the whole set', () => {
  const tooLong = 'x'.repeat(AD_HEADLINE_MAX_CHARS + 1)

  assert.throws(() =>
    AdIdeasSchema.parse({
      ...AD_IDEAS,
      groups: [{ ...AD_GROUP, headlines: [tooLong, ...AD_GROUP.headlines.slice(1)] }, AD_GROUP]
    })
  )
})

test('a description past the character ceiling rejects too', () => {
  const tooLong = 'x'.repeat(AD_DESCRIPTION_MAX_CHARS + 1)

  assert.throws(() =>
    AdIdeasSchema.parse({
      ...AD_IDEAS,
      groups: [{ ...AD_GROUP, descriptions: [tooLong, AD_GROUP.descriptions[1]] }, AD_GROUP]
    })
  )
})

test('an empty negatives list is a valid answer, because padding one is inventing intent', () => {
  const parsed = AdIdeasSchema.parse({ ...AD_IDEAS, negatives: [] })

  assert.deepEqual(parsed.negatives, [])
})

test('one group is not a campaign, so the set rejects below the minimum', () => {
  assert.throws(() => AdIdeasSchema.parse({ ...AD_IDEAS, groups: [AD_GROUP] }))
})
