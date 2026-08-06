import { POST_SIGNIN_REDIRECT } from '@/lib/constants'

// Middleware puts the page a signed-out visitor asked for in `callbackUrl`, and sign-in hands it
// straight to `redirectTo`. That makes it attacker-controlled, so it is an allowlist rather than a
// sanitizer: one leading slash and nothing else. `//evil.com` and `/\evil.com` are protocol-relative
// URLs that browsers resolve off-site, and a backslash is a slash to some of them, so both are
// refused along with anything carrying a scheme. Anything rejected falls back to the dashboard,
// because losing the deep link is a nuisance and honouring it is an open redirect.
export function safeCallbackUrl(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return POST_SIGNIN_REDIRECT
  if (raw.startsWith('//') || raw.startsWith('/\\')) return POST_SIGNIN_REDIRECT
  return raw
}

// The credentials provider is a local and e2e escape hatch, never a real sign-in path. Two
// independent conditions must hold, because NODE_ENV alone is not a deploy boundary: the e2e server
// and any staging container run as `development` while still being reachable.
export function credentialsLoginAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.ALLOW_CREDENTIALS_LOGIN === '1'
}

// Middleware only guarantees a session, not the operator's. Fails closed when ADMIN_EMAIL is unset.
export function isAdmin(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  return Boolean(email && adminEmail && email === adminEmail)
}
