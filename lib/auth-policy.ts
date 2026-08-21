import type { Account, Profile } from 'next-auth'
import { ADMIN_ROLE, GITHUB_EMAILS_URL, POST_SIGNIN_REDIRECT, VERIFIED_EMAIL } from '@/lib/constants'
import type { OAuthProvider } from '@/lib/enums'
import type { User } from '@/db/schema'

export function safeCallbackUrl(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return POST_SIGNIN_REDIRECT
  if (raw.startsWith('//') || raw.startsWith('/\\')) return POST_SIGNIN_REDIRECT
  return raw
}

// Optional claims arrive as booleans from Google.
function claimIsTrue(value: unknown): boolean {
  return value === true || value === 'true' || value === '1'
}

type GithubEmail = { email: string; primary: boolean; verified: boolean }

/**
 * GitHub does not emit a verified-email claim, and its `profile.email` can be null when the account
 * keeps its address private. The only place the truth exists is the REST endpoint, so this asks it.
 *
 * **Every failure path refuses.** A timeout, a 403 from a missing `user:email` scope, or a body that
 * is not the shape expected all return null — because the alternative, reading "we could not check"
 * as "verified", turns a GitHub outage into an open door onto rows that hold credits.
 */
async function githubVerifiedEmail(accessToken: string | undefined): Promise<string | null> {
  if (!accessToken) return null

  try {
    const res = await fetch(GITHUB_EMAILS_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    if (!res.ok) {
      console.error('[auth] github email lookup refused', res.status)
      return null
    }

    const emails: unknown = await res.json()
    if (!Array.isArray(emails)) return null

    const primary = (emails as GithubEmail[]).find(
      (entry) =>
        entry?.primary === true && entry?.verified === true && typeof entry.email === 'string'
    )

    return primary?.email ?? null
  } catch (error) {
    console.error('[auth] github email lookup failed', error)
    return null
  }
}

/**
 * The address a provider will vouch for, or null.
 *
 * The user row is keyed on email and there is no `accounts` table, so **whoever presents an address
 * next owns everything in the row** — which, after credits, means money. Each provider therefore
 * declares *how* its address is verified, and **a provider with no strategy declared is refused
 * outright**. That default is the point: a provider added to `authConfig` without an entry here locks
 * itself out rather than letting itself in. See docs/security.md.
 *
 * **The address returned is what keys the row, and it is not always `profile.email`** — GitHub's can
 * be null or unverified while a different address on the same account is the verified primary one.
 */
export async function verifiedEmailFor(
  account: Account | null | undefined,
  profile: Profile | undefined
): Promise<string | null> {
  const strategy = VERIFIED_EMAIL[account?.provider as OAuthProvider]
  if (!strategy) return null

  if (strategy.kind === 'claim') {
    if (!claimIsTrue(profile?.[strategy.claim])) return null
    return typeof profile?.email === 'string' ? profile.email : null
  }

  return githubVerifiedEmail(account?.access_token)
}

export function credentialsLoginAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.ALLOW_CREDENTIALS_LOGIN === '1'
}

export function githubLoginAllowed(): boolean {
  return Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET)
}

// Case and surrounding space are not identity. The domain half is case insensitive by RFC and every
// provider this app accepts treats the local half that way too, so `Ada@Example.com` and
// `ada@example.com` are one mailbox -- and a dashboard that kept a trailing space on a pasted value
// is not a different operator. It used to compare with `===`, which turned both into a promotion
// that silently did nothing.
//
// This decides who is *granted* the role, never who owns the row: the address keying the row is still
// the exact one the provider verified. See docs/invariants.md.
function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

// Grants the role at sign-in. The gate below is what authorizes a request. See docs/invariants.md.
export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!email || !adminEmail) return false

  const matches = normalizeEmail(email) === normalizeEmail(adminEmail)

  // **Said out loud, because the failure is otherwise perfectly silent.** Nothing in the app reads
  // the role today, so a mismatch has no symptom at all: the operator sets the variable, signs in,
  // and has no way to tell it did not take. The address is deliberately not logged -- what is useful
  // here is that a sign-in happened and did not match, not who it was.
  if (!matches) {
    console.warn('[auth] ADMIN_EMAIL is set but the signed-in address did not match it')
  }

  return matches
}

export function isAdmin(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === ADMIN_ROLE
}
