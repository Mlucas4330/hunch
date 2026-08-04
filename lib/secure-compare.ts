import { createHash, timingSafeEqual } from 'node:crypto'

// Compares through fixed-width digests so the check runs in constant time regardless of where the
// inputs diverge, and so unequal lengths cannot throw or leak the secret's size.
export function secretsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false

  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(a), digest(b))
}
