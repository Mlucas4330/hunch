import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { screenshotPath } from '@/lib/screenshots'

export const runtime = 'nodejs'

// Variant previews live on a volume, not in `public/`, so the app serves them. Behind a reverse
// proxy with access to that volume this route would not exist -- the proxy would serve the files
// and they would never touch Node.
//
// The path segment comes from an unauthenticated caller, and screenshotPath() is what makes that
// safe: it allowlists the exact shape saveScreenshot writes instead of sanitizing, then checks
// containment. It lives in lib/screenshots.ts because the prune job needs the identical check.
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
        // The filename already carries a random suffix, so a given URL never changes content.
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch {
    // A miss answers exactly like a malformed name: nothing here confirms what the directory holds.
    return new NextResponse(null, { status: 404 })
  }
}
