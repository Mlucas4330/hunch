import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { NextResponse } from 'next/server'
import { SCREENSHOT_FILENAME_PATTERN } from '@/lib/constants'

export const runtime = 'nodejs'

// Variant previews live on a volume, not in `public/`, so the app serves them. Behind a reverse
// proxy with access to that volume this route would not exist -- the proxy would serve the files
// and they would never touch Node.
//
// The path segment comes from an unauthenticated caller, so it is allowlisted rather than
// sanitized: only the exact shape saveScreenshot() writes is accepted, which admits no separator
// and no dot segment at all. Stripping `..` is the approach that keeps losing to encoding tricks;
// refusing everything that is not a known-good filename does not. The containment check below is
// then a cheap second lock rather than the only one.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const dir = process.env.SCREENSHOT_DIR
  const { file } = await params

  if (!dir || !SCREENSHOT_FILENAME_PATTERN.test(file)) {
    return new NextResponse(null, { status: 404 })
  }

  const root = resolve(dir)
  const path = resolve(root, file)

  if (!path.startsWith(root + sep)) {
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
