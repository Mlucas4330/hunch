import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { db } from '@/db'
import { variants } from '@/db/schema'
import { SCREENSHOT_FILENAME_PATTERN, SCREENSHOT_RETENTION_DAYS } from '@/lib/constants'
import { authorizeCron } from '@/lib/cron-auth'
import { deleteScreenshot, screenshotPublicPath } from '@/lib/screenshots'

export const runtime = 'nodejs'

const DAY_MS = 24 * 60 * 60 * 1000

// Nothing else deletes a variant preview, so without this the volume grows for the life of the
// deploy and eventually fails writes -- which the screenshot route reports as `url: null`, i.e. as
// previews quietly not working. GET to match finalize-experiments and the curl-based cron service:
// a mutating GET is the established shape here, and a POST needs -X and will be forgotten.
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const dir = process.env.SCREENSHOT_DIR

  if (!dir) return NextResponse.json({ pruned: 0 })

  // SCREENSHOT_DIR does not exist until the first saveScreenshot calls mkdir, so a fresh deploy's
  // first run finds nothing. That has to read as `pruned: 0` and not as a 500, or the very first
  // nightly run looks like a permanently broken cron.
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])

  const cutoff = Date.now() - SCREENSHOT_RETENTION_DAYS * DAY_MS
  const expired: string[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !SCREENSHOT_FILENAME_PATTERN.test(entry.name)) continue

    const stats = await stat(join(dir, entry.name)).catch(() => null)

    if (stats && stats.mtimeMs < cutoff) expired.push(entry.name)
  }

  if (expired.length === 0) return NextResponse.json({ pruned: 0 })

  // Database first, unlink second, because the two failure windows are not symmetric. Unlinking
  // first and then failing to clear the column leaves a row pointing at a missing file, and that is
  // the one state that renders a broken image -- the report server-renders screenshot_url straight
  // into the preview. This order leaves an orphaned file instead: the next click regenerates,
  // nothing looks broken, and tomorrow's run retries the delete.
  //
  // Matched by URL equality rather than by parsing the variant id out of the filename. A variant can
  // own an expired file and a current one at the same time (a retry click can render twice), and
  // deriving the id from the expired one would discard a screenshot that is still good.
  //
  // screenshot_url is not indexed. A nightly sequential scan on this table is the intended cost --
  // do not add an index for it.
  await db
    .update(variants)
    .set({ screenshotUrl: null })
    .where(
      inArray(
        variants.screenshotUrl,
        expired.map((file) => screenshotPublicPath(file))
      )
    )

  for (const file of expired) {
    await deleteScreenshot(file)
  }

  // Count only: a directory listing in the response body would tell an unauthorized caller what the
  // volume holds if the secret ever leaked.
  return NextResponse.json({ pruned: expired.length })
}
