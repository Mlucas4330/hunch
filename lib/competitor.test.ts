import { test } from 'node:test'
import assert from 'node:assert/strict'
import { competitorInput, competitorValues, type CompetitorMeasurement } from './competitor'
import { measuredFindings } from './readout'
import {
  FIXTURE_CRAWLER_ACCESS,
  FIXTURE_KEYWORDS,
  FIXTURE_MOBILE,
  FIXTURE_PERFORMANCE,
  FIXTURE_SEO,
  FIXTURE_STRUCTURE
} from './ai/fixtures'
import type { ReadoutInput } from './readout'

const THEIRS: CompetitorMeasurement = {
  url: 'https://competitor.example/pricing',
  structure: FIXTURE_STRUCTURE,
  seo: FIXTURE_SEO,
  performance: FIXTURE_PERFORMANCE,
  keywords: FIXTURE_KEYWORDS,
  mobile: FIXTURE_MOBILE
}

const MINE: ReadoutInput = {
  structure: FIXTURE_STRUCTURE,
  seo: FIXTURE_SEO,
  performance: FIXTURE_PERFORMANCE,
  crawler: FIXTURE_CRAWLER_ACCESS,
  sameness: null,
  keywords: FIXTURE_KEYWORDS,
  mobile: FIXTURE_MOBILE,
  market: 'us'
}

// The competitor's robots.txt is not fetched: the crawler_access group is about the reader's own site,
// and somebody else's robots.txt compares nothing worth comparing.
test('the competitor readout has no crawler_access group', () => {
  const findings = measuredFindings(competitorInput(THEIRS, 'us'))

  assert.equal(findings.length > 0, true)
  assert.equal(findings.some((finding) => finding.group === 'crawler_access'), false)
})

test('the competitor is measured by the same code, so a shared finding compares directly', () => {
  const mine = measuredFindings(MINE)
  const theirs = competitorValues(competitorInput(THEIRS, 'us'), mine)

  assert.equal(theirs.get('form_fields')?.value, FIXTURE_STRUCTURE.formFieldCount)
  assert.equal(theirs.get('lcp')?.value, FIXTURE_PERFORMANCE.lcpMs)
})

// A missing entry means "not counted on that page", never "counted as none" -- the same rule the
// snapshot delta obeys. Comparing an absent finding against zero would invent a number.
test('a finding only one side has is left out rather than compared against zero', () => {
  const mine = measuredFindings(MINE)
  const theirs = competitorValues(competitorInput(THEIRS, 'us'), mine)

  assert.equal(
    mine.some((finding) => finding.id === 'ai_crawlers_blocked'),
    true,
    'the reader has a crawler_access group'
  )
  assert.equal(theirs.has('ai_crawlers_blocked'), false)
})

test('nothing the reader was not shown is carried over from the other page', () => {
  // The reader's page has no form, so it has no form findings. The competitor's does.
  const noForm: ReadoutInput = {
    ...MINE,
    structure: { ...FIXTURE_STRUCTURE, formCount: 0 }
  }

  const theirs = competitorValues(competitorInput(THEIRS, 'us'), measuredFindings(noForm))

  assert.equal(
    theirs.has('form_fields'),
    false,
    'a column with no cell on the reader side has nothing to sit beside'
  )
})

test('the market gates the same finding on both pages', () => {
  const counted = { ...FIXTURE_STRUCTURE, trustBadgeCount: 0, hasCnpj: false }
  const withCnpj: CompetitorMeasurement = { ...THEIRS, structure: counted }

  const br = measuredFindings(competitorInput(withCnpj, 'br'))
  const us = measuredFindings(competitorInput(withCnpj, 'us'))

  assert.equal(br.some((finding) => finding.id === 'no_cnpj'), true)
  assert.equal(us.some((finding) => finding.id === 'no_cnpj'), false)
})
