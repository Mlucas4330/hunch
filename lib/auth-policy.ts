import type { Profile } from 'next-auth'
import { ADMIN_ROLE, POST_SIGNIN_REDIRECT, VERIFIED_EMAIL_CLAIM } from '@/lib/constants'
import type { OAuthProvider } from '@/lib/enums'
import type { User } from '@/db/schema'

export function safeCallbackUrl(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return POST_SIGNIN_REDIRECT
  if (raw.startsWith('//') || raw.startsWith('/\\')) return POST_SIGNIN_REDIRECT
  return raw
}

export function microsoftLoginAllowed(): boolean {
  return Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
  )
}

// Optional claims arrive as booleans from Google and have been seen as strings from Entra ID.
function claimIsTrue(value: unknown): boolean {
  return value === true || value === 'true' || value === '1'
}

// Fails closed: a provider with no claim listed, or a claim that is absent, never keys a user row.
// See docs/security.md.
export function providerVerifiedEmail(
  providerId: string | undefined,
  profile: Profile | undefined
): boolean {
  const claim = VERIFIED_EMAIL_CLAIM[providerId as OAuthProvider]
  return Boolean(claim) && claimIsTrue(profile?.[claim])
}

export function credentialsLoginAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.ALLOW_CREDENTIALS_LOGIN === '1'
}

// Grants the role at sign-in. The gate below is what authorizes a request. See docs/invariants.md.
export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  return Boolean(email && adminEmail && email === adminEmail)
}

export function isAdmin(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === ADMIN_ROLE
}
