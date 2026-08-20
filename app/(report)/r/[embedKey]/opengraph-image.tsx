import { ImageResponse } from 'next/og'
import { dictionaryFor } from '@/lib/i18n'
import { DEFAULT_LOCALE, OG_COLORS, OG_IMAGE_SIZE } from '@/lib/constants'
import { displayHost } from '@/lib/host'
import { loadReport } from '@/lib/analyses'
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

  // The same two counts the cover shows, so the unfurl and the page it opens never disagree.
  const changes = analysis.hypotheses.length + analysis.flowFixes.length
  const ready = analysis.hypotheses.filter((h) => h.target === 'auto').length

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
            {displayHost(analysis.url)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <OgStat
            label={t.report.changesFound}
            value={String(changes)}
            accent={OG_COLORS.purple}
          />
          <OgStat label={t.report.copyWritten} value={String(ready)} accent={OG_COLORS.coral} />
        </div>
      </OgFrame>
    ),
    size
  )
}
