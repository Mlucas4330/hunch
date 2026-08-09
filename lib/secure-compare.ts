import { createHash, timingSafeEqual } from 'node:crypto'

export function secretsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false

  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(a), digest(b))
}
