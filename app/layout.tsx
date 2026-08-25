import type { Metadata } from 'next'
import { Geist, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import { getDictionary, getLocale } from '@/lib/i18n'
import { siteOrigin } from '@/lib/app-url'
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      className={`scroll-smooth ${geist.variable} ${spaceGrotesk.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">{children}</body>
    </html>
  )
}
