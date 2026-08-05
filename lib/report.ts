import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { isUuid } from '@/lib/uuid'

// The public report is read three times per request -- the page, its metadata, and its OG image --
// so the lookup is cached rather than repeated. A mangled key returns null here instead of reaching
// Postgres with a bad uuid cast, and an unknown one is indistinguishable from it.
export const loadReport = cache(async (embedKey: string) => {
  if (!isUuid(embedKey)) return null

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.embedKey, embedKey),
    with: {
      hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.position) } } },
      flowFixes: { orderBy: (f, { asc }) => asc(f.position) }
    }
  })

  return analysis ?? null
})

// Falls back to the raw string rather than throwing: this feeds a title and an OG card, so a
// malformed stored url must still render something.
export function reportHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
