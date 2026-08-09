import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { isUuid } from '@/lib/uuid'
import { canWhiteLabel } from '@/lib/usage'

export const loadReport = cache(async (embedKey: string) => {
  if (!isUuid(embedKey)) return null

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.embedKey, embedKey),
    with: {
      hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.position) } } },
      flowFixes: { orderBy: (f, { asc }) => asc(f.position) },
      user: { columns: { plan: true } }
    }
  })

  return analysis ?? null
})

export function reportIsWhiteLabelled(
  analysis: Awaited<ReturnType<typeof loadReport>>
): boolean {
  return analysis !== null && canWhiteLabel(analysis.user.plan)
}
