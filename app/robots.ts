import type { MetadataRoute } from 'next'
import { siteOrigin } from '@/lib/app-url'
import { PROTECTED_PREFIXES } from '@/lib/constants'

// `/r` is disallowed even though it is public: a report is one prospect's teardown behind an opaque
// key, so it is thin, near-duplicate and semi-private. It still carries full Open Graph tags -- those
// are read by the unfurler, not by the crawler.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...PROTECTED_PREFIXES, '/auth', '/api', '/r']
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
    host: siteOrigin()
  }
}
