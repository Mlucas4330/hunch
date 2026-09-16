import { test } from 'node:test'
import assert from 'node:assert/strict'
import { screenshotPath, screenshotStorageReady } from './screenshots'

// The serving route is public, exactly as a report link is, so this guard is the whole of its
// authorization. The twin of brand-assets.test.ts, deliberately.

const FILE = '0f8fad5b-d9cb-469f-a165-70867728950e.png'

test('a screenshot path resolves only for a name saveScreenshot writes, inside SCREENSHOT_DIR', () => {
  process.env.SCREENSHOT_DIR = 'screenshot-test'

  try {
    assert.ok(screenshotPath(FILE)?.endsWith(FILE))
    assert.equal(screenshotPath(`../${FILE}`), null)
    assert.equal(screenshotPath(`../../etc/passwd`), null)
    assert.equal(screenshotPath('shot.png'), null)
    assert.equal(screenshotPath(FILE.replace('.png', '.svg')), null)
  } finally {
    delete process.env.SCREENSHOT_DIR
  }
})

test('with no volume configured nothing is stored and nothing resolves', () => {
  delete process.env.SCREENSHOT_DIR

  assert.equal(screenshotStorageReady(), false)
  assert.equal(screenshotPath(FILE), null)
})
