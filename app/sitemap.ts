import type { MetadataRoute } from 'next'
import { siteOrigin } from '@/lib/app-url'

// The landing page is the only public, indexable route. Everything else is session-gated, an auth
// screen, or a per-prospect report -- all of which declare noindex in their own metadata.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteOrigin()}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1
    }
  ]
}
