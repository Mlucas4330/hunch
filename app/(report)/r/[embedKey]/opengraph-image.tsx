import { ImageResponse } from 'next/og'
import { dictionaryFor } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { DEFAULT_LOCALE, OG_COLORS, OG_IMAGE_SIZE } from '@/lib/constants'
import { displayHost } from '@/lib/host'
import { loadReport, reportIsWhiteLabelled } from '@/lib/report'
import { OgFrame, OgStat, OgWordmark } from '@/components/og'

const t = dictionaryFor(DEFAULT_LOCALE)

export const alt = t.metadata.ogImageAlt
export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await params
  const analysis = await loadReport(embedKey)

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
  const whiteLabel = reportIsWhiteLabelled(analysis)

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {whiteLabel ? <div style={{ display: 'flex' }} /> : <OgWordmark />}
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
            {displayHost(analysis.url)}
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
