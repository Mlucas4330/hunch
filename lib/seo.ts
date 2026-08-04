import type { Metadata } from 'next'
import { getDictionary } from '@/lib/i18n'
import { DEFAULT_OG_IMAGE_PATH } from '@/lib/constants'

// One shape for every route's metadata, so a new page cannot ship with half a card.
//
// There is deliberately no `alternates.languages`: the locale is a cookie with no route segment, so
// `en` and `pt-BR` are the same URL. Claiming hreflang alternates that do not exist as URLs would be
// a lie to crawlers; the cookie-less render (DEFAULT_LOCALE) is what gets indexed.
//
// `ownImage` is for a route that ships its own co-located opengraph-image.tsx: the images field is
// left out so the file convention fills it. Everyone else is pointed at the site-wide card by hand,
// because the `openGraph` object returned here replaces the root layout's whole object -- and the
// root card resolved there goes with it.
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

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: metadata.title,
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
