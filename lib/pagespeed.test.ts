import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pageSpeedScore, parsePageSpeed } from './pagespeed'

// The shape PageSpeed Insights answers with, cut down to the fields the parser reads.
const RESPONSE = {
  lighthouseResult: {
    categories: {
      performance: { score: 0.54, auditRefs: [{ id: 'largest-contentful-paint' }, { id: 'diagnostics' }] },
      accessibility: { score: 0.81, auditRefs: [{ id: 'image-alt' }, { id: 'color-contrast' }] },
      'best-practices': { score: 0.92, auditRefs: [] },
      seo: { score: 0.75, auditRefs: [{ id: 'meta-description' }] }
    },
    audits: {
      'largest-contentful-paint': {
        title: 'Largest Contentful Paint',
        score: 0.21,
        displayValue: '4.8 s',
        scoreDisplayMode: 'numeric'
      },
      diagnostics: { title: 'Diagnostics', score: null, scoreDisplayMode: 'informative' },
      'image-alt': {
        title: 'Image elements do not have [alt] attributes',
        score: 0,
        scoreDisplayMode: 'binary'
      },
      'color-contrast': { title: 'Contrast is sufficient', score: 1, scoreDisplayMode: 'binary' },
      'meta-description': {
        title: 'Document does not have a meta description',
        score: 0,
        scoreDisplayMode: 'binary'
      }
    }
  },
  loadingExperience: {
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3400, category: 'AVERAGE' },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 12, category: 'AVERAGE' }
    }
  },
  originLoadingExperience: {
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2100, category: 'FAST' }
    }
  }
}

test('category scores come back out of 100', () => {
  const parsed = parsePageSpeed(RESPONSE)!

  assert.deepEqual(parsed.categories, {
    performance: 54,
    accessibility: 81,
    'best-practices': 92,
    seo: 75
  })
})

test('only scored audits that did not pass are kept, with their category', () => {
  const parsed = parsePageSpeed(RESPONSE)!

  assert.deepEqual(
    parsed.audits.map((audit) => [audit.id, audit.category]),
    [
      ['largest-contentful-paint', 'performance'],
      ['image-alt', 'accessibility'],
      ['meta-description', 'seo']
    ]
  )
  assert.equal(parsed.audits[0].displayValue, '4.8 s')
  assert.equal(parsed.audits[1].displayValue, null)
})

test('field data prefers the URL and says so', () => {
  const parsed = parsePageSpeed(RESPONSE)!

  assert.equal(parsed.field?.scope, 'page')
  assert.equal(parsed.field?.metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile, 3400)
})

test('field data falls back to the origin when the URL has none', () => {
  const parsed = parsePageSpeed({ ...RESPONSE, loadingExperience: {} })!

  assert.equal(parsed.field?.scope, 'origin')
  assert.equal(parsed.field?.metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile, 2100)
})

test('no field data at all is null, never a set of zeroes', () => {
  const parsed = parsePageSpeed({
    lighthouseResult: RESPONSE.lighthouseResult
  })!

  assert.equal(parsed.field, null)
})

test('a response without a Lighthouse result is not a measurement', () => {
  assert.equal(parsePageSpeed({}), null)
  assert.equal(parsePageSpeed(null), null)
})

test('the overall score is the average of the scored categories', () => {
  const parsed = parsePageSpeed(RESPONSE)!

  assert.equal(pageSpeedScore(parsed), 76)
  assert.equal(
    pageSpeedScore({ ...parsed, categories: { ...parsed.categories, seo: null } }),
    76,
    'an unscored category is left out rather than counted as zero'
  )
  assert.equal(pageSpeedScore(null), null)
})
