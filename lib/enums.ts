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
