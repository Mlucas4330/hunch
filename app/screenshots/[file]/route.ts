import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { screenshotPath } from '@/lib/screenshots'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const path = screenshotPath(file)

  if (!path) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const png = await readFile(path)

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
