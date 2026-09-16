import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { SCREENSHOT_FILENAME_PATTERN, SCREENSHOT_PUBLIC_PATH } from '@/lib/constants'

/**
 * The phone screenshot of a measured page, on the same volume as the brand logo and under the same
 * rules. `lib/brand-assets.ts` is the file this mirrors, deliberately: two stores that serve bytes
 * back by name must not have two different ideas of what a safe name is.
 */

export function screenshotStorageReady(): boolean {
  return Boolean(process.env.SCREENSHOT_DIR)
}

// The only way from a request to a file: a name saveScreenshot could have written, inside
// SCREENSHOT_DIR. The prefix check is what refuses `..` however it was spelled.
export function screenshotPath(file: string): string | null {
  const dir = process.env.SCREENSHOT_DIR

  if (!dir || !SCREENSHOT_FILENAME_PATTERN.test(file)) return null

  const root = resolve(dir)
  const path = resolve(root, file)

  if (!path.startsWith(root + sep)) return null

  return path
}

export async function saveScreenshot(image: Buffer): Promise<string> {
  const dir = process.env.SCREENSHOT_DIR

  if (!dir) throw new Error('SCREENSHOT_DIR is not set')

  const filename = `${randomUUID()}.png`

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), image)

  return `${SCREENSHOT_PUBLIC_PATH}/${filename}`
}

export async function deleteScreenshot(url: string): Promise<void> {
  if (!url.startsWith(`${SCREENSHOT_PUBLIC_PATH}/`)) return

  const path = screenshotPath(url.slice(SCREENSHOT_PUBLIC_PATH.length + 1))
  if (!path) return

  await unlink(path).catch(() => {})
}
