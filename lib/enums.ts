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

export const SUBSCRIPTION_STATUS = ['active', 'canceled', 'past_due'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number]
