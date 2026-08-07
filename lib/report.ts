import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { isUuid } from '@/lib/uuid'
import { canWhiteLabel } from '@/lib/usage'

// The public report is read three times per request -- the page, its metadata, and its OG image --
// so the lookup is cached rather than repeated. A mangled key returns null here instead of reaching
// Postgres with a bad uuid cast, and an unknown one is indistinguishable from it.
export const loadReport = cache(async (embedKey: string) => {
  if (!isUuid(embedKey)) return null

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.embedKey, embedKey),
    with: {
      hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.position) } } },
      flowFixes: { orderBy: (f, { asc }) => asc(f.position) },
      // `columns` is not an optimization here, it is the boundary. This feeds an UNAUTHENTICATED
      // page, and everything a server component reads ends up in the RSC payload the reader
      // receives -- so `user: true` would publish the owner's email, stripe customer id and usage
      // counters inside the report they sent to their own client. Only the plan crosses, and only
      // because canWhiteLabel needs it.
      user: { columns: { plan: true } }
    }
  })

  return analysis ?? null
})

// Whether this report renders as the owner's deliverable (no mark, no wall) or as our lead magnet.
// Derived here so the page, its metadata and its OG card cannot disagree -- they all read the same
// cached loadReport result, so this costs no extra query.
export function reportIsWhiteLabelled(
  analysis: Awaited<ReturnType<typeof loadReport>>
): boolean {
  return analysis !== null && canWhiteLabel(analysis.user.plan)
}

// Falls back to the raw string rather than throwing: this feeds a title and an OG card, so a
// malformed stored url must still render something.
export function reportHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
