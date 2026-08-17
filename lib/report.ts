import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, type User } from '@/db/schema'
import { isUuid } from '@/lib/uuid'
import { canWhiteLabel } from '@/lib/usage'

export const loadReport = cache(async (embedKey: string) => {
  if (!isUuid(embedKey)) return null

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.embedKey, embedKey),
    with: {
      hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.position) } } },
      flowFixes: { orderBy: (f, { asc }) => asc(f.position) },
      user: { columns: { plan: true, brandName: true, brandLogoUrl: true, brandAccent: true } }
    }
  })

  return analysis ?? null
})

export type ReportBrand = {
  whiteLabel: boolean
  name: string | null
  logoUrl: string | null
  accent: string | null
}

type BrandSource = Pick<User, 'plan' | 'brandName' | 'brandLogoUrl' | 'brandAccent'>

export function brandFor(user: BrandSource): ReportBrand {
  const whiteLabel = canWhiteLabel(user.plan)

  if (!whiteLabel) return { whiteLabel, name: null, logoUrl: null, accent: null }

  return {
    whiteLabel,
    name: user.brandName,
    logoUrl: user.brandLogoUrl,
    accent: user.brandAccent
  }
}

export function reportBrand(analysis: Awaited<ReturnType<typeof loadReport>>): ReportBrand {
  if (!analysis) return { whiteLabel: false, name: null, logoUrl: null, accent: null }

  return brandFor(analysis.user)
}
