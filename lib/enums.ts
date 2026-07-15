export const SUBSCRIPTION_PLAN = ['free', 'solo', 'team'] as const
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[number]

export const SECTIONS = [
  'headline',
  'subheadline',
  'cta',
  'social_proof',
  'pricing',
  'features',
  'hero_image',
  'navigation',
  'other'
] as const
export type Section = (typeof SECTIONS)[number]

export const HYPOTHESIS_STATUS = ['pending', 'testing', 'completed', 'skipped'] as const
export type HypothesisStatus = (typeof HYPOTHESIS_STATUS)[number]

// How a hypothesis's copy change can be applied: `auto` resolves to a single element and can be
// swapped by the embed snippet / screenshot; `manual` needs the founder to place it by hand.
export const HYPOTHESIS_TARGET = ['auto', 'manual'] as const
export type HypothesisTarget = (typeof HYPOTHESIS_TARGET)[number]

export const VARIANT_STATUS = ['proposed', 'testing', 'winner', 'rejected'] as const
export type VariantStatus = (typeof VARIANT_STATUS)[number]

export const SUBSCRIPTION_STATUS = ['active', 'canceled', 'past_due'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number]

export const EXPERIMENT_STATUS = ['running', 'stopped', 'completed'] as const
export type ExperimentStatus = (typeof EXPERIMENT_STATUS)[number]

export const EXPERIMENT_ARM = ['control', 'variant'] as const
export type ExperimentArm = (typeof EXPERIMENT_ARM)[number]

export const TRACK_EVENT = ['impression', 'conversion'] as const
export type TrackEvent = (typeof TRACK_EVENT)[number]

export const EXPERIMENT_ACTION = ['stop', 'declare_winner', 'discard'] as const
export type ExperimentAction = (typeof EXPERIMENT_ACTION)[number]

export const EXPERIMENT_DURATIONS = [7, 14, 30] as const
export type ExperimentDuration = (typeof EXPERIMENT_DURATIONS)[number]

export const EXPERIMENT_RECOMMENDATION = ['ship_variant', 'keep_control', 'inconclusive'] as const
export type ExperimentRecommendation = (typeof EXPERIMENT_RECOMMENDATION)[number]
