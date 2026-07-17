import type { Section } from '@/lib/enums'

// Variant targeting: current copy is only snapped onto an element when its word count is within
// this ratio of the copy. Guards against snapping a long merged string onto a tiny element.
export const TARGET_MATCH_MAX_WORD_RATIO = 1.3

export const SECTION_LABEL: Record<Section, string> = {
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

// Color tokens are defined in app/globals.css (@theme). These maps only reference
// semantic token utility classes -- never raw Tailwind color classes or hex values.
export const SECTION_BADGE_CLASS: Record<Section, string> = {
  headline: 'bg-purple/15 text-purple',
  subheadline: 'bg-purple/10 text-purple-soft',
  cta: 'bg-coral/15 text-coral',
  social_proof: 'bg-teal/15 text-teal',
  pricing: 'bg-amber/15 text-amber',
  features: 'bg-blue/15 text-blue',
  hero_image: 'bg-neutral/15 text-neutral',
  navigation: 'bg-neutral/15 text-neutral',
  other: 'bg-neutral/15 text-neutral'
}

export function impactScoreBadgeClass(score: number): string {
  if (score >= 8) return 'bg-coral/15 text-coral'
  if (score >= 5) return 'bg-amber/15 text-amber'
  return 'bg-neutral/15 text-neutral'
}

export function effortScoreBadgeClass(score: number): string {
  if (score <= 3) return 'bg-green/15 text-green'
  if (score <= 6) return 'bg-amber/15 text-amber'
  return 'bg-red/15 text-red'
}

// Solid channel color for the segmented gauge fill (mirrors the badge score ranges).
export function impactScoreFillClass(score: number): string {
  if (score >= 8) return 'bg-coral'
  if (score >= 5) return 'bg-amber'
  return 'bg-neutral'
}

export function effortScoreFillClass(score: number): string {
  if (score <= 3) return 'bg-green'
  if (score <= 6) return 'bg-amber'
  return 'bg-red'
}
