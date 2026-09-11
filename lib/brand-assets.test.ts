import { test } from 'node:test'
import assert from 'node:assert/strict'
import { brandLogoPath, sniffBrandLogoType } from './brand-assets'

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
const FILE = '0f8fad5b-d9cb-469f-a165-70867728950e.png'

test('a PNG and a JPEG are recognised from their own bytes', () => {
  assert.equal(sniffBrandLogoType(PNG), 'png')
  assert.equal(sniffBrandLogoType(JPEG), 'jpg')
})

test('an SVG and a cut-off PNG signature are refused', () => {
  assert.equal(sniffBrandLogoType(SVG), null)
  assert.equal(sniffBrandLogoType(PNG.slice(0, 4)), null)
})

test('a logo path resolves only for a name saveBrandLogo writes, inside BRAND_DIR', () => {
  process.env.BRAND_DIR = 'brand-test'

  try {
    assert.ok(brandLogoPath(FILE)?.endsWith(FILE))
    assert.equal(brandLogoPath(`../${FILE}`), null)
    assert.equal(brandLogoPath('logo.png'), null)
    assert.equal(brandLogoPath(FILE.replace('.png', '.svg')), null)
  } finally {
    delete process.env.BRAND_DIR
  }

  assert.equal(brandLogoPath(FILE), null)
})
