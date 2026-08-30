import type { MetadataRoute } from 'next'
import { siteOrigin } from '@/lib/app-url'
import { BLOG_PATH, BLOG_POST_DATE, PRIVACY_PATH, PRIVACY_UPDATED } from '@/lib/constants'
import { BLOG_SLUG } from '@/lib/enums'

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin()

  return [
    {
      url: `${origin}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: `${origin}${BLOG_PATH}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6
    },
    {
      url: `${origin}${PRIVACY_PATH}`,
      lastModified: new Date(PRIVACY_UPDATED),
      changeFrequency: 'yearly',
      priority: 0.3
    },
    ...BLOG_SLUG.map((slug) => ({
      url: `${origin}${BLOG_PATH}/${slug}`,
      lastModified: new Date(BLOG_POST_DATE[slug]),
      changeFrequency: 'yearly' as const,
      priority: 0.5
    }))
  ]
}
