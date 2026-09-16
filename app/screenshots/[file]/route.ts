import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { screenshotPath } from '@/lib/screenshots'

export const runtime = 'nodejs'

/**
 * One phone screenshot, by the name the run wrote. The twin of app/brand/[file]/route.ts, and it
 * answers 404 to everything `screenshotPath` will not vouch for: the guard is the whole of the
 * authorization story, because a report link is public and so is this.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const path = screenshotPath(file)

  if (!path) return new NextResponse(null, { status: 404 })

  try {
    const image = await readFile(path)

    // Immutable, because a new run writes a new uuid rather than a new version of this name.
    return new NextResponse(new Uint8Array(image), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
