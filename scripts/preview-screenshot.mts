import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { screenshotVariant } from '../lib/scrape.ts'

const url = process.argv[2] ?? 'https://vercel.com'
const selector = process.argv[3] ?? 'h1'
const outDir = resolve(process.argv[4] ?? 'screenshot-preview')

const VARIANT_COPY = 'This headline was rewritten by Hunch'

async function shoot(label: string, copy: string | null, file: string) {
  console.log(`Capturing ${label} ...`)
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
