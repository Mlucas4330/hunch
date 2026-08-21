import type { Testimonial } from '@/lib/i18n/dictionaries/en'

/**
 * The shape to copy, and nothing that ships.
 *
 * **Imported by nothing on purpose.** These are invented and they say so, because a placeholder quote
 * that reads like a real one is the failure this file exists to prevent: it gets pasted into en.ts
 * "for now" and then sits on a live marketing page attributed to a person who does not exist.
 *
 * When you have real ones, paste them into `landing.testimonials.items` in both en.ts and pt-BR.ts
 * and the section appears on its own. Keep the person's own words in their own language -- a quote is
 * something someone said, so it is the one string on the page that is never rewritten for a locale.
 */
export const TESTIMONIALS_EXAMPLE: Testimonial[] = [
  {
    quote: 'PLACEHOLDER. Replace with something a real customer actually wrote to you.',
    name: 'Example Name',
    role: 'Example role',
    company: 'Example Company'
  },
  {
    quote: 'PLACEHOLDER. Two or three sentences reads best in the card.',
    name: 'Example Name',
    role: 'Example role',
    company: 'Example Company'
  },
  {
    quote: 'PLACEHOLDER. Do not ship this file.',
    name: 'Example Name',
    role: 'Example role',
    company: 'Example Company'
  }
]
