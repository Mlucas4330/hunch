import { ImageResponse } from 'next/og'
import { dictionaryFor } from '@/lib/i18n'
import { DEFAULT_LOCALE, OG_COLORS, OG_IMAGE_SIZE } from '@/lib/constants'
import { OgFrame, OgWordmark } from '@/components/og'

// Read by unfurlers, which send no cookies -- so the locale is always DEFAULT_LOCALE here rather
// than getDictionary()'s cookie lookup, and the image stays statically generated.
const t = dictionaryFor(DEFAULT_LOCALE)

export const alt = t.metadata.ogImageAlt
export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <OgWordmark />
        <div
          style={{
            display: 'flex',
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: OG_COLORS.ink
          }}
        >
          {t.metadata.pages.landing.title}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: OG_COLORS.mutedForeground }}>
          {t.landing.lead}
        </div>
      </OgFrame>
    ),
    size
  )
}
