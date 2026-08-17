import type { Metadata } from 'next'
import { getDictionary } from '@/lib/i18n'
import { DEFAULT_OG_IMAGE_PATH } from '@/lib/constants'

export async function pageMetadata(input: {
  title: string
  description: string
  path: string
  index: boolean
  ownImage?: boolean
  unbranded?: boolean
  brandName?: string | null
}): Promise<Metadata> {
  const { metadata } = await getDictionary()
  const { title, description, path, index, ownImage, unbranded, brandName } = input
  const images = ownImage ? undefined : [DEFAULT_OG_IMAGE_PATH]

  // `unbranded` strips us; `brandName` puts the agency there instead. A browser prints the title into
  // the page header, so this is the fourth white-label surface. See docs/invariants.md.
  const siteName = unbranded ? brandName : metadata.title

  return {
    title: unbranded ? { absolute: siteName ? `${title} | ${siteName}` : title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      ...(siteName ? { siteName } : {}),
      url: path,
      title,
      description,
      ...(images ? { images } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(images ? { images } : {})
    },
    ...(index
      ? {}
      : {
          robots: {
            index: false,
            follow: false,
            googleBot: { index: false, follow: false }
          }
        })
  }
}
