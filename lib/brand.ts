import type { User } from '@/db/schema'

export type ReportBrand = { name: string | null; logoUrl: string | null }

/**
 * The one place a report's brand is decided. The header, the metadata and the OG card all read it, so
 * none of them can show the agency while another still shows Hunch. See docs/invariants.md.
 */
export function brandFor(user: Pick<User, 'brandName' | 'brandLogoUrl'> | null): ReportBrand {
  return { name: user?.brandName ?? null, logoUrl: user?.brandLogoUrl ?? null }
}

export function hasBrand(brand: ReportBrand): boolean {
  return brand.name !== null || brand.logoUrl !== null
}
