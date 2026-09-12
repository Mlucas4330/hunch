import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBacklinkSummary, parseRankedKeywords } from './seranking'

// Cut down from real SE Ranking responses for rdstation.com on the `br` database.
const SUMMARY = {
  summary: [
    {
      target: 'rdstation.com',
      backlinks: 467134,
      refdomains: 10405,
      dofollow_refdomains: 8076,
      domain_inlink_rank: 88,
      inlink_rank: 28
    }
  ]
}

const REFDOMAINS = {
  refdomains: [
    { refdomain: 'podcasts.apple.com', backlinks: 1, dofollow_backlinks: 1, domain_inlink_rank: 100, first_seen: '2025-03-21' },
    { backlinks: 4, domain_inlink_rank: 60 }
  ]
}

const KEYWORDS = [
  {
    keyword: 'google ads',
    position: 3,
    prev_pos: 3,
    volume: 550000,
    url: 'https://www.rdstation.com/blog/marketing/o-que-e-google-ads/',
    difficulty: 100,
    traffic: 14634,
    traffic_percent: 6.91
  }
]

const OVERVIEW = { organic: { keywords_count: 124123, traffic_sum: 211725 }, adv: {} }

test('the backlink summary and its top referring domains are read from two calls', () => {
  assert.deepEqual(parseBacklinkSummary(SUMMARY, REFDOMAINS), {
    rank: 88,
    backlinks: 467134,
    referringDomains: 10405,
    dofollowReferringDomains: 8076,
    topReferringDomains: [{ domain: 'podcasts.apple.com', rank: 100, backlinks: 1 }]
  })
})

test('a failed summary is null, and a failed domain list is not an empty one', () => {
  assert.equal(parseBacklinkSummary(null, REFDOMAINS), null)
  assert.equal(parseBacklinkSummary(SUMMARY, null)?.topReferringDomains, null)
})

test('a domain the index knows nothing about has zero backlinks', () => {
  const backlinks = parseBacklinkSummary({ summary: [] }, { refdomains: [] })

  assert.equal(backlinks?.referringDomains, 0)
  assert.equal(backlinks?.rank, null)
  assert.deepEqual(backlinks?.topReferringDomains, [])
})

test('ranked keywords carry position, volume, the page that ranks, and the total from the overview', () => {
  assert.deepEqual(parseRankedKeywords(KEYWORDS, OVERVIEW), {
    total: 124123,
    keywords: [
      {
        keyword: 'google ads',
        position: 3,
        searchVolume: 550000,
        url: 'https://www.rdstation.com/blog/marketing/o-que-e-google-ads/',
        traffic: 14634,
        difficulty: 100
      }
    ]
  })
})

test('a failed keyword call is null, and a failed overview leaves the total unknown rather than zero', () => {
  assert.equal(parseRankedKeywords(null, OVERVIEW), null)
  assert.equal(parseRankedKeywords(KEYWORDS, null)?.total, null)
})
