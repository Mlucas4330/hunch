import type { Metadata } from 'next'
import { getDictionary } from '@/lib/i18n'
import { DEFAULT_OG_IMAGE_PATH } from '@/lib/constants'

export async function pageMetadata(input: {
  title: string
  description: string
  path: string
  index: boolean
  ownImage?: boolean
}): Promise<Metadata> {
  const { metadata } = await getDictionary()
  const { title, description, path, index, ownImage } = input
  const images = ownImage ? undefined : [DEFAULT_OG_IMAGE_PATH]

  const siteName = metadata.title

  return {
    title,
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
