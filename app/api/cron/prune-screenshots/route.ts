import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { inArray } from 'drizzle-orm'
import { db } from '@/db'
import { variants } from '@/db/schema'
import {
  PRUNE_BATCH_SIZE,
  SCREENSHOT_FILENAME_PATTERN,
  SCREENSHOT_RETENTION_DAYS
} from '@/lib/constants'
import { authorizeCron } from '@/lib/cron-auth'
import { deleteScreenshot, screenshotPublicPath } from '@/lib/screenshots'

export const runtime = 'nodejs'

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const dir = process.env.SCREENSHOT_DIR

  if (!dir) return NextResponse.json({ pruned: 0 })

  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])

  const cutoff = Date.now() - SCREENSHOT_RETENTION_DAYS * DAY_MS
  const expired: string[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !SCREENSHOT_FILENAME_PATTERN.test(entry.name)) continue

    const stats = await stat(join(dir, entry.name)).catch(() => null)

    if (stats && stats.mtimeMs < cutoff) expired.push(entry.name)
  }

  if (expired.length === 0) return NextResponse.json({ pruned: 0 })

  const paths = expired.map((file) => screenshotPublicPath(file))

  // **Both columns, cleared independently.** A rendered preview is two files now -- the page as it is
  // and the page with the rewrite applied -- and they are written in the same moment, so they expire
  // in the same run. Clearing only `screenshot_url` left the row pointing at a `screenshot_before_url`
  // whose file had just been deleted. Two statements rather than one `or`, because a single update
  // matching either column would null both, and a column whose file still exists must keep it.
  //
  // **Batched, because the backlog is unbounded.** `inArray` binds one parameter per path against a
  // 65535 ceiling, and the run most likely to blow through it is the first one after the cron has
  // been failing -- see PRUNE_BATCH_SIZE.
  for (let i = 0; i < paths.length; i += PRUNE_BATCH_SIZE) {
    const batch = paths.slice(i, i + PRUNE_BATCH_SIZE)

    await db
      .update(variants)
      .set({ screenshotUrl: null })
      .where(inArray(variants.screenshotUrl, batch))

    await db
      .update(variants)
      .set({ screenshotBeforeUrl: null })
      .where(inArray(variants.screenshotBeforeUrl, batch))
  }

  for (const file of expired) {
    await deleteScreenshot(file)
  }

  return NextResponse.json({ pruned: expired.length })
}
