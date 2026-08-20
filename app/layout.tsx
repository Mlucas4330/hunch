import type { Metadata } from 'next'
import { Geist, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import { getDictionary, getLocale } from '@/lib/i18n'
import { siteOrigin } from '@/lib/app-url'
import { REVEAL_READY_ATTR } from '@/lib/constants'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono'
})

export async function generateMetadata(): Promise<Metadata> {
  const { metadata } = await getDictionary()

  return {
    metadataBase: new URL(siteOrigin()),
    title: { default: metadata.title, template: `%s | ${metadata.title}` },
    description: metadata.description,
    applicationName: metadata.title,
    openGraph: {
      type: 'website',
      siteName: metadata.title,
      title: metadata.title,
      description: metadata.description
    },
    twitter: {
      card: 'summary_large_image',
      title: metadata.title,
      description: metadata.description
    }
  }
}

/**
 * Arms the scroll reveal before the first paint.
 *
 * It has to be an inline script rather than an effect: `.reveal` is only hidden while this attribute
 * is present, and setting it from React would paint the content, blank it, then fade it back in.
 * Skipping it under reduced motion is what makes that setting turn the whole effect off, and its
 * absence is also the safety net -- if this never runs, nothing is ever hidden. See
 * docs/components.md.
 */
const ARM_REVEAL = `if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('${REVEAL_READY_ATTR}','')`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale} className={`${geist.variable} ${spaceGrotesk.variable} ${plexMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ARM_REVEAL }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">{children}</body>
    </html>
  )
}
