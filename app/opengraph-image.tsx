import { ImageResponse } from 'next/og'
import { dictionaryFor } from '@/lib/i18n'
import { DEFAULT_LOCALE, OG_COLORS, OG_IMAGE_SIZE } from '@/lib/constants'
import { OgFrame, OgWordmark } from '@/components/og'

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
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: OG_COLORS.ink
          }}
        >
          {t.metadata.description}
        </div>
      </OgFrame>
    ),
    size
  )
}
