import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { brandLogoContentType, brandLogoPath } from '@/lib/brand-assets'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const path = brandLogoPath(file)

  if (!path) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const image = await readFile(path)

    return new NextResponse(new Uint8Array(image), {
      headers: {
        'Content-Type': brandLogoContentType(file),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
