import type { MetadataRoute } from 'next'
import { siteOrigin } from '@/lib/app-url'
import { PROTECTED_PREFIXES } from '@/lib/constants'

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
