import { ImageResponse } from 'next/og'
import { dictionaryFor } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { DEFAULT_LOCALE, OG_COLORS, OG_IMAGE_SIZE } from '@/lib/constants'
import { loadReport, reportHost } from '@/lib/report'
import { OgFrame, OgStat, OgWordmark } from '@/components/og'

// Unfurlers send no cookies, so the locale is DEFAULT_LOCALE rather than the reader's cookie.
const t = dictionaryFor(DEFAULT_LOCALE)

export const alt = t.metadata.ogImageAlt
export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await params
  const analysis = await loadReport(embedKey)

  // An unknown key renders the plain branded card rather than throwing: this URL is fetched by
  // someone else's unfurler, and a 500 there is a broken-looking link.
  if (!analysis) {
    return new ImageResponse(
      (
        <OgFrame>
          <OgWordmark />
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, color: OG_COLORS.ink }}>
            {t.metadata.description}
          </div>
        </OgFrame>
      ),
      size
    )
  }

  const count = analysis.hypotheses.length
  const topImpact = analysis.hypotheses.reduce((max, h) => Math.max(max, h.impactScore), 0)

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <OgWordmark />
          <div style={{ display: 'flex', fontSize: 24, color: OG_COLORS.mutedForeground }}>
            {t.report.plan}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', fontSize: 26, color: OG_COLORS.mutedForeground }}>
            {t.report.landingPageAnalyzed}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: OG_COLORS.ink
            }}
          >
            {reportHost(analysis.url)}
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: OG_COLORS.mutedForeground }}>
            {fill(t.report.heading, { count })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <OgStat label={t.report.testsFound} value={String(count)} accent={OG_COLORS.purple} />
          <OgStat label={t.report.topImpact} value={`${topImpact}/10`} accent={OG_COLORS.coral} />
        </div>
      </OgFrame>
    ),
    size
  )
}
