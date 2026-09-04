import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { screenshotVariant } from '../lib/scrape.ts'

const url = process.argv[2] ?? 'https://vercel.com'
const selector = process.argv[3] ?? 'h1'
const outDir = resolve(process.argv[4] ?? 'screenshot-preview')

const VARIANT_COPY = 'This headline was rewritten by Hunch'

async function write(label: string, png: Buffer, file: string) {
  const path = resolve(outDir, file)
  await writeFile(path, png)
  console.log(`  ${label} -> ${path} (${png.length} bytes)`)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  console.log(`\nURL      : ${url}`)
  console.log(`Selector : ${selector}`)
  console.log(`Variant  : ${VARIANT_COPY}\n`)

  // One call, one page load, both images. Two navigations are precisely what the slider cannot
  // tolerate: a carousel advancing or an ad slot filling differently between the two shots reads as
  // the whole page twitching.
  console.log('Capturing both shots from one load ...')
  const { before, after, overflow } = await screenshotVariant(url, selector, VARIANT_COPY)

  await write('control', before, 'before.png')
  await write('variant', after, 'after.png')
  if (overflow) console.log('  OVERFLOW: the variant is still clipped at the smallest size')

  console.log('\nDone. Compare before.png and after.png: only the words may differ.\n')
}

main().catch((error) => {
  console.error('\nScreenshot test failed:', error)
  if (error instanceof Error && error.cause) console.error('cause:', error.cause)
  process.exit(1)
})
