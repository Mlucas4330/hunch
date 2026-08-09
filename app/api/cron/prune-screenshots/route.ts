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

  return NextResponse.json({ pruned: expired.length })
}
