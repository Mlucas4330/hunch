/**
 * Manual visual check for the variant-preview pipeline. Not a test: it asserts nothing and cannot
 * fail a build. It exists because applyVariantCopy distributes the new copy across the element's
 * text nodes to avoid destroying its inline children, and whether a gradient span or a <br> survived
 * that split is only answerable by looking at the two images.
 *
 * Drives the real production function (screenshotVariant) against a live landing page and writes
 * before/after PNGs straight to disk. It calls neither POST /api/report/screenshot nor
 * saveScreenshot, so it needs no SCREENSHOT_DIR and writes nothing a report would later serve.
 *
 * Usage:
 *   npm run preview:screenshot                                  # defaults: https://vercel.com, h1
 *   npm run preview:screenshot -- https://foo.com "h1" out-dir  # url, selector, output dir
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { screenshotVariant } from '../lib/scrape.ts'

const url = process.argv[2] ?? 'https://vercel.com'
const selector = process.argv[3] ?? 'h1'
const outDir = resolve(process.argv[4] ?? 'screenshot-preview')

// A punchy, obviously-different headline so the swap is unmistakable in the "after" shot.
const VARIANT_COPY = 'This headline was rewritten by Hunch'

async function shoot(label: string, copy: string | null, file: string) {
  console.log(`Capturing ${label} ...`)
  // A null selector shoots the page untouched, which is what makes the pair diffable: the styling
  // in `after` has to match `before` everywhere except the words themselves.
  const buffer = await screenshotVariant(url, copy === null ? null : selector, copy ?? '')
  const path = resolve(outDir, file)
  await writeFile(path, buffer)
  console.log(`  -> ${path} (${buffer.length} bytes)`)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  console.log(`\nURL      : ${url}`)
  console.log(`Selector : ${selector}`)
  console.log(`Variant  : ${VARIANT_COPY}\n`)

  await shoot('control (untouched page)', null, 'before.png')
  await shoot('variant (swapped copy)', VARIANT_COPY, 'after.png')

  console.log('\nDone. Compare before.png and after.png: only the words may differ.\n')
}

main().catch((error) => {
  console.error('\nScreenshot test failed:', error)
  if (error instanceof Error && error.cause) console.error('cause:', error.cause)
  process.exit(1)
})
