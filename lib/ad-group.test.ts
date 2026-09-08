import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AD_GROUP, isAdGroup } from './enums'

/**
 * The guard between a query string a stranger writes and a key into the dictionary.
 *
 * Every case below renders the control hero, which is the copy the page has always had. There is no
 * failure mode where a reader sees a broken hero, and none where the parameter's own text reaches
 * the page: it only ever selects a key. See docs/ads.md.
 */

test('every ad group in the union is accepted', () => {
  for (const group of AD_GROUP) assert.equal(isAdGroup(group), true, group)
})

const REFUSED: Array<{ value: unknown; why: string }> = [
  { value: undefined, why: 'nobody clicked an ad, which is the ordinary case' },
  { value: '', why: 'the parameter is present and empty, as a broken final URL leaves it' },
  { value: 'nope', why: 'a value that names no ad group' },
  { value: 'FIX', why: 'the right word in the wrong case is still not a key' },
  { value: ' fix', why: 'a space is not trimmed into a match' },
  { value: ['fix', 'audit'], why: 'repeating the parameter hands over an array' },
  { value: '<script>alert(1)</script>', why: 'the parameter is attacker controlled' },
  { value: '__proto__', why: 'a key that exists on every object and names no ad group' },
  { value: 'constructor', why: 'the same trick by another name' },
  { value: 0, why: 'not a string at all' },
  { value: null, why: 'nor a missing one' }
]

for (const { value, why } of REFUSED) {
  test(`refuses ${JSON.stringify(value)}: ${why}`, () => {
    assert.equal(isAdGroup(value), false)
  })
}
