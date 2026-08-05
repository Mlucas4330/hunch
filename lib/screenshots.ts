import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { SCREENSHOT_PUBLIC_PATH } from '@/lib/constants'

// The file is world-readable once the proxy serves it, so the name must not be derivable from the
// variant id -- that id is returned by the authenticated API and would otherwise make every
// screenshot guessable.
export async function saveScreenshot(variantId: string, png: Buffer): Promise<string> {
  const dir = process.env.SCREENSHOT_DIR

  if (!dir) throw new Error('SCREENSHOT_DIR is not set')

  const filename = `${variantId}-${randomUUID()}.png`

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), png)

  return `${SCREENSHOT_PUBLIC_PATH}/${filename}`
}
