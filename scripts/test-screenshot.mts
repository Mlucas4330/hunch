/**
 * Manual test for the variant-preview screenshot pipeline.
 *
 * Drives the real production function (screenshotVariant) against a live landing page and writes
 * before/after PNGs to disk so you can eyeball the variant copy swapped onto the page. This is
 * exactly what POST /api/report/screenshot does, minus the Vercel Blob upload -- so it works
 * regardless of how the Blob store is configured.
 *
 * Usage:
 *   npx tsx scripts/test-screenshot.mts [url] [selector] [outDir]
 *   npx tsx scripts/test-screenshot.mts https://vercel.com h1
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { screenshotVariant } from '../lib/scrape.ts'

const url = process.argv[2] ?? 'https://vercel.com'
const selector = process.argv[3] ?? 'h1'
const outDir = resolve(process.argv[4] ?? 'screenshot-test')

// A punchy, obviously-different headline so the swap is unmistakable in the "after" shot.
const VARIANT_COPY = 'This headline was rewritten by Hunch'

async function shoot(label: string, copy: string, file: string) {
  console.log(`Capturing ${label} ...`)
  const buffer = await screenshotVariant(url, selector, copy)
  const path = resolve(outDir, file)
  await writeFile(path, buffer)
  console.log(`  -> ${path} (${buffer.length} bytes)`)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  console.log(`\nURL      : ${url}`)
  console.log(`Selector : ${selector}`)
  console.log(`Variant  : ${VARIANT_COPY}\n`)

  await shoot('variant (swapped copy)', VARIANT_COPY, 'after.png')

  console.log('\nDone. Open after.png to see the variant applied to the page.\n')
}

main().catch((error) => {
  console.error('\nScreenshot test failed:', error)
  if (error instanceof Error && error.cause) console.error('cause:', error.cause)
  process.exit(1)
})
