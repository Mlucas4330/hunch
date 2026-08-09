import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { SCREENSHOT_FILENAME_PATTERN, SCREENSHOT_PUBLIC_PATH } from '@/lib/constants'

export function screenshotPath(file: string): string | null {
  const dir = process.env.SCREENSHOT_DIR

  if (!dir || !SCREENSHOT_FILENAME_PATTERN.test(file)) return null

  const root = resolve(dir)
  const path = resolve(root, file)

  if (!path.startsWith(root + sep)) return null

  return path
}

export async function saveScreenshot(variantId: string, png: Buffer): Promise<string> {
  const dir = process.env.SCREENSHOT_DIR

  if (!dir) throw new Error('SCREENSHOT_DIR is not set')

  const filename = `${variantId}-${randomUUID()}.png`

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), png)

  return screenshotPublicPath(filename)
}

export async function deleteScreenshot(file: string): Promise<void> {
  const path = screenshotPath(file)

  if (!path) return

  await unlink(path).catch(() => {})
}

export function screenshotPublicPath(file: string): string {
  return `${SCREENSHOT_PUBLIC_PATH}/${file}`
}
