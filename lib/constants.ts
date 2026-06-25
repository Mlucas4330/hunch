import type { HypothesisStatus, Section, SubscriptionPlan } from '@/lib/enums'

export const FREE_ANALYSES_LIMIT = 3

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  solo: 29,
  team: 79
}

export const PLAN_SEATS: Record<SubscriptionPlan, number> = {
  free: 1,
  solo: 1,
  team: 3
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

export const PLAN_BADGE_CLASS: Record<SubscriptionPlan, string> = {
  free: 'bg-neutral/15 text-neutral',
  solo: 'bg-purple/15 text-purple',
  team: 'bg-amber/15 text-amber'
}

export const HYPOTHESIS_STATUS_LABEL: Record<HypothesisStatus, string> = {
  pending: 'Pending',
  testing: 'Testing',
  completed: 'Completed',
  skipped: 'Skipped'
}

export function impactScoreClass(score: number): string {
  if (score >= 8) return 'text-coral'
  if (score >= 5) return 'text-amber'
  return 'text-neutral'
}

export function effortScoreClass(score: number): string {
  if (score <= 3) return 'text-green'
  if (score <= 6) return 'text-amber'
  return 'text-red'
}
