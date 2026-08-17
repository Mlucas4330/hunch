import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { canWhiteLabel } from '@/lib/usage'
import { deleteBrandLogo, saveBrandLogo, sniffBrandLogoType } from '@/lib/brand-assets'
import {
  BRAND_ACCENT_PATTERN,
  BRAND_LOGO_MAX_BYTES,
  BRAND_NAME_MAX_LENGTH,
  BRAND_PUBLIC_PATH
} from '@/lib/constants'

export const runtime = 'nodejs'

function fileOf(url: string | null): string | null {
  if (!url?.startsWith(`${BRAND_PUBLIC_PATH}/`)) return null

  return url.slice(BRAND_PUBLIC_PATH.length + 1)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!canWhiteLabel(user.plan)) return NextResponse.json({ error: 'plan_required' }, { status: 403 })

  const limited = await enforceRateLimit('brand', user.id)
  if (limited) return limited

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'invalid_body' }, { status: 422 })

  const rawName = String(form.get('name') ?? '').trim()
  if (rawName.length > BRAND_NAME_MAX_LENGTH) {
    return NextResponse.json({ error: 'name_too_long' }, { status: 422 })
  }

  const rawAccent = String(form.get('accent') ?? '').trim()
  if (rawAccent && !BRAND_ACCENT_PATTERN.test(rawAccent)) {
    return NextResponse.json({ error: 'invalid_accent' }, { status: 422 })
  }

  const update: {
    brandName: string | null
    brandAccent: string | null
    brandLogoUrl?: string | null
  } = {
    brandName: rawName || null,
    brandAccent: rawAccent || null
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

    // Sniffed from the bytes, never from logo.type: the declared Content-Type is attacker-controlled
    // and an SVG served same-origin can carry script. See docs/security.md.
    if (!type) return NextResponse.json({ error: 'unsupported_logo' }, { status: 422 })

    update.brandLogoUrl = await saveBrandLogo(bytes, type)
  }

  await db.update(users).set(update).where(eq(users.id, user.id))

  // Only after the row no longer points at it, so a failed write never leaves a dangling column.
  if (update.brandLogoUrl !== undefined && user.brandLogoUrl) {
    const previous = fileOf(user.brandLogoUrl)
    if (previous) await deleteBrandLogo(previous)
  }

  return NextResponse.json({
    brandName: update.brandName,
    brandAccent: update.brandAccent,
    brandLogoUrl: update.brandLogoUrl ?? user.brandLogoUrl
  })
}
