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
