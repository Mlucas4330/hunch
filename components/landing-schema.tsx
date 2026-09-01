import {
  CREDIT_PACK_CURRENCY,
  CREDIT_PACKS,
  SCHEMA_APPLICATION_CATEGORY,
  SCHEMA_OPERATING_SYSTEM
} from '@/lib/constants'
import { siteOrigin } from '@/lib/app-url'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

/**
 * What the product is and what it charges, as structured data.
 *
 * The only JSON-LD this site had was the FAQ's, which describes seven answers and says nothing about
 * the thing being sold. Our own audit asked for this twice -- once as a `SoftwareApplication` and
 * once as machine readable pricing -- and the second half of that was wrong: the prices have always
 * been in the served HTML, because `CreditPacks` is a client component that Next still renders on the
 * server. What was missing is the markup that names them as prices.
 *
 * **Every value comes from where it already lives.** `offers` is built off CREDIT_PACKS rather than
 * typed out, for the reason credit-packs.tsx states about the dictionary: a price edited in one place
 * and not the other is a page that lies about what it costs, and structured data that lies is worse
 * than none because a crawler quotes it without a reader ever seeing it. Name and description come
 * from the dictionary, so the schema is in the same language as the page around it.
 *
 * No `aggregateRating`, no `review`: nobody has left one. No `subscription` and no `priceValidUntil`
 * -- the packs are one off purchases with no expiry, and inventing either would be describing a
 * product we do not sell. See docs/invariants.md and docs/seo.md.
 *
 * Server rendered, like LandingFaq and for the same reason: this component has no `'use client'`, so
 * the schema is in the initial HTML where a crawler that runs no JavaScript still finds it.
 */
export function LandingSchema({ dictionary }: { dictionary: Dictionary }) {
  const origin = siteOrigin()
  const { metadata } = dictionary

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: metadata.title,
    url: origin,
    description: metadata.pages.landing.description,
    applicationCategory: SCHEMA_APPLICATION_CATEGORY,
    operatingSystem: SCHEMA_OPERATING_SYSTEM,
    offers: CREDIT_PACKS.map((pack) => ({
      '@type': 'Offer',
      name: dictionary.credits.packs[pack.id].name,
      price: String(pack.amountBrl),
      priceCurrency: CREDIT_PACK_CURRENCY,
      url: `${origin}/#credits`
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
