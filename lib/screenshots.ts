import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { SCREENSHOT_FILENAME_PATTERN, SCREENSHOT_PUBLIC_PATH } from '@/lib/constants'

// The one place a caller-supplied filename becomes a path on disk. The serving route, the prune job
// and deleteScreenshot all need this check, and a security check that exists in four copies is a
// check that will drift -- so it exists once and they all go through it.
//
// The name is allowlisted rather than sanitized: only the exact shape saveScreenshot writes is
// accepted, and that shape admits no separator and no dot segment at all. Stripping `..` is the
// approach that keeps losing to encoding tricks; refusing everything that is not a known-good
// filename does not. The containment check is then a cheap second lock rather than the only one.
export function screenshotPath(file: string): string | null {
  const dir = process.env.SCREENSHOT_DIR

  if (!dir || !SCREENSHOT_FILENAME_PATTERN.test(file)) return null

  const root = resolve(dir)
  const path = resolve(root, file)

  if (!path.startsWith(root + sep)) return null

  return path
}

// The file is world-readable once the proxy serves it, so the name must not be derivable from the
// variant id -- that id is returned by the authenticated API and would otherwise make every
// screenshot guessable.
export async function saveScreenshot(variantId: string, png: Buffer): Promise<string> {
  const dir = process.env.SCREENSHOT_DIR

  if (!dir) throw new Error('SCREENSHOT_DIR is not set')

  const filename = `${variantId}-${randomUUID()}.png`

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), png)

  return screenshotPublicPath(filename)
}

// Takes a filename rather than a public URL because the prune job iterates the directory and already
// holds filenames -- handing it a URL only so this could strip it back off would be ceremony.
// A name that fails the allowlist is a no-op, not an error: the caller is a nightly job, and there is
// nothing for it to do about a file it was never allowed to address.
export async function deleteScreenshot(file: string): Promise<void> {
  const path = screenshotPath(file)

  if (!path) return

  // ENOENT is expected, not exceptional: an overlapping run or a manual cleanup gets here first.
  await unlink(path).catch(() => {})
}

export function screenshotPublicPath(file: string): string {
  return `${SCREENSHOT_PUBLIC_PATH}/${file}`
}
