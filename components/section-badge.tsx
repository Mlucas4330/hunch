import { Badge } from '@/components/ui/badge'
import { SECTION_BADGE_CLASS } from '@/lib/constants'
import type { Section } from '@/lib/enums'
import { cn } from '@/lib/utils'

const SECTION_LABEL: Record<Section, string> = {
  headline: 'Headline',
  subheadline: 'Subheadline',
  cta: 'CTA',
  social_proof: 'Social Proof',
  pricing: 'Pricing',
  features: 'Features',
  hero_image: 'Hero Image',
  navigation: 'Navigation',
  other: 'Other'
}

export function SectionBadge({ section, className }: { section: Section; className?: string }) {
  return (
    <Badge className={cn(SECTION_BADGE_CLASS[section], className)}>{SECTION_LABEL[section]}</Badge>
  )
}
