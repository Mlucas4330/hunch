import Image from 'next/image'
import { Wordmark } from '@/components/wordmark'
import { BRAND_LOGO_DISPLAY_HEIGHT, BRAND_LOGO_DISPLAY_MAX_WIDTH } from '@/lib/constants'
import type { ReportBrand } from '@/lib/brand'

// The logo, else the agency's name, else ours. See docs/invariants.md.
export function ReportBrandMark({ brand }: { brand: ReportBrand }) {
  if (brand.logoUrl) {
    return (
      <Image
        src={brand.logoUrl}
        alt={brand.name ?? ''}
        height={BRAND_LOGO_DISPLAY_HEIGHT}
        width={BRAND_LOGO_DISPLAY_MAX_WIDTH}
        data-testid="agency-brand"
        className="h-8 w-auto object-contain object-left"
        unoptimized
      />
    )
  }

  if (brand.name) {
    return (
      <span
        data-testid="agency-brand"
        className="font-display text-lg font-semibold tracking-tight text-foreground"
      >
        {brand.name}
      </span>
    )
  }

  return <Wordmark />
}
