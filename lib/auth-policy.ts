import { ADMIN_ROLE, POST_SIGNIN_REDIRECT } from '@/lib/constants'
import type { User } from '@/db/schema'

export function safeCallbackUrl(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return POST_SIGNIN_REDIRECT
  if (raw.startsWith('//') || raw.startsWith('/\\')) return POST_SIGNIN_REDIRECT
  return raw
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
