import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { enforceRateLimit } from '@/lib/rate-limit'
import {
  brandStorageReady,
  deleteBrandLogo,
  saveBrandLogo,
  sniffBrandLogoType
} from '@/lib/brand-assets'
import { BRAND_LOGO_MAX_BYTES, BRAND_NAME_MAX_LENGTH } from '@/lib/constants'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit('brand', user.id)
  if (limited) return limited

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'invalid_body' }, { status: 422 })

  const name = String(form.get('name') ?? '').trim()
  if (name.length > BRAND_NAME_MAX_LENGTH) {
    return NextResponse.json({ error: 'name_too_long' }, { status: 422 })
  }

  const update: { brandName: string | null; brandLogoUrl?: string | null } = {
    brandName: name || null
  }

  const logo = form.get('logo')

  if (form.get('removeLogo') === '1') {
    update.brandLogoUrl = null
  } else if (logo instanceof File && logo.size > 0) {
    if (logo.size > BRAND_LOGO_MAX_BYTES) {
      return NextResponse.json({ error: 'logo_too_large' }, { status: 422 })
    }

    const bytes = Buffer.from(await logo.arrayBuffer())
    const type = sniffBrandLogoType(bytes)

    // From the bytes, never from logo.type: the declared Content-Type is the caller's to choose.
    if (!type) return NextResponse.json({ error: 'unsupported_logo' }, { status: 422 })

    if (!brandStorageReady()) {
      return NextResponse.json({ error: 'brand_storage_unavailable' }, { status: 503 })
    }

    update.brandLogoUrl = await saveBrandLogo(bytes, type)
  }

  await db.update(users).set(update).where(eq(users.id, user.id))

  // Only once the row no longer points at it, so a failed write never leaves the column dangling.
  if (update.brandLogoUrl !== undefined && user.brandLogoUrl) {
    await deleteBrandLogo(user.brandLogoUrl)
  }

  return NextResponse.json({
    brandName: update.brandName,
    brandLogoUrl: update.brandLogoUrl === undefined ? user.brandLogoUrl : update.brandLogoUrl
  })
}
