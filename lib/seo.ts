import type { Metadata } from 'next'
import { getDictionary } from '@/lib/i18n'
import { DEFAULT_OG_IMAGE_PATH } from '@/lib/constants'
import { hasBrand, type ReportBrand } from '@/lib/brand'

export async function pageMetadata(input: {
  title: string
  description: string
  path: string
  index: boolean
  ownImage?: boolean
  // A report whose owner set a brand: the agency replaces Hunch in the tab title and the site name.
  // See docs/invariants.md.
  brand?: ReportBrand
}): Promise<Metadata> {
  const { metadata } = await getDictionary()
  const { title, description, path, index, ownImage, brand } = input
  const images = ownImage ? undefined : [DEFAULT_OG_IMAGE_PATH]

  const branded = brand !== undefined && hasBrand(brand)
  const siteName = branded ? brand.name : metadata.title

  return {
    title: branded ? { absolute: brand.name ? `${title} | ${brand.name}` : title } : title,
    ...(branded ? { applicationName: brand.name ?? title } : {}),
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
