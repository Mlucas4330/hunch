import type {
  ExperimentArm,
  ExperimentRecommendation,
  ExperimentStatus,
  HypothesisStatus,
  Section,
  SubscriptionPlan,
  VariantStatus
} from '@/lib/enums'

export const FREE_ANALYSES_LIMIT = 3

export const FREE_EXPERIMENTS_LIMIT = 1

export const DEFAULT_EXPERIMENT_DURATION = 14

// Public outreach report: how many top hypotheses are shown in full before the
// remaining ones are blurred behind the waitlist wall.
export const REPORT_PREVIEW_LIMIT = 3

// Variant targeting: a hypothesis is only "auto" (safe to swap in a screenshot or live test) when
// its current copy resolves to a single element whose word count is within this ratio of the copy.
// Guards against snapping a long merged string onto a tiny element (e.g. a 3-word badge).
export const TARGET_MATCH_MAX_WORD_RATIO = 1.3

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

// Filled style for a selected option card (mirrors SECTION_BADGE_CLASS colors).
export const SECTION_SELECTED_CLASS: Record<Section, string> = {
  headline: 'border-purple bg-purple/15 ring-2 ring-purple',
  subheadline: 'border-purple-soft bg-purple/10 ring-2 ring-purple-soft',
  cta: 'border-coral bg-coral/15 ring-2 ring-coral',
  social_proof: 'border-teal bg-teal/15 ring-2 ring-teal',
  pricing: 'border-amber bg-amber/15 ring-2 ring-amber',
  features: 'border-blue bg-blue/15 ring-2 ring-blue',
  hero_image: 'border-neutral bg-neutral/15 ring-2 ring-neutral',
  navigation: 'border-neutral bg-neutral/15 ring-2 ring-neutral',
  other: 'border-neutral bg-neutral/15 ring-2 ring-neutral'
}

// Solid section color for circuit nodes.
export const SECTION_DOT_CLASS: Record<Section, string> = {
  headline: 'bg-purple',
  subheadline: 'bg-purple-soft',
  cta: 'bg-coral',
  social_proof: 'bg-teal',
  pricing: 'bg-amber',
  features: 'bg-blue',
  hero_image: 'bg-neutral',
  navigation: 'bg-neutral',
  other: 'bg-neutral'
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

export const HYPOTHESIS_STATUS_BADGE_CLASS: Record<HypothesisStatus, string> = {
  pending: 'bg-neutral/15 text-neutral',
  testing: 'bg-amber/15 text-amber',
  completed: 'bg-green/15 text-green',
  skipped: 'bg-neutral/10 text-muted-foreground'
}

export const VARIANT_STATUS_LABEL: Record<VariantStatus, string> = {
  proposed: 'Proposed',
  testing: 'Testing',
  winner: 'Winner',
  rejected: 'Rejected'
}

export const VARIANT_STATUS_BADGE_CLASS: Record<VariantStatus, string> = {
  proposed: 'bg-neutral/15 text-neutral',
  testing: 'bg-amber/15 text-amber',
  winner: 'bg-green/15 text-green',
  rejected: 'bg-red/15 text-red'
}

export const EXPERIMENT_STATUS_LABEL: Record<ExperimentStatus, string> = {
  running: 'Running',
  stopped: 'Stopped',
  completed: 'Completed'
}

export const EXPERIMENT_STATUS_BADGE_CLASS: Record<ExperimentStatus, string> = {
  running: 'bg-amber/15 text-amber',
  stopped: 'bg-neutral/15 text-neutral',
  completed: 'bg-green/15 text-green'
}

export const EXPERIMENT_ARM_LABEL: Record<ExperimentArm, string> = {
  control: 'Control',
  variant: 'Variant'
}

export const EXPERIMENT_RECOMMENDATION_LABEL: Record<ExperimentRecommendation, string> = {
  ship_variant: 'Ship the variant',
  keep_control: 'Keep current copy',
  inconclusive: 'Inconclusive - not enough traffic'
}

export const EXPERIMENT_RECOMMENDATION_BADGE_CLASS: Record<ExperimentRecommendation, string> = {
  ship_variant: 'bg-green/15 text-green',
  keep_control: 'bg-neutral/15 text-neutral',
  inconclusive: 'bg-amber/15 text-amber'
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
