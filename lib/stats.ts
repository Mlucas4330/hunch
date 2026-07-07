import type { ExperimentRecommendation } from '@/lib/enums'

export const MIN_SAMPLE = 30
export const SIGNIFICANCE_LEVEL = 0.05

export type ArmCounts = { impressions: number; conversions: number }

export type ArmResult = { n: number; conversions: number; rate: number }

export type ExperimentResult = {
  control: ArmResult
  variant: ArmResult
  upliftPct: number | null
  pValue: number | null
  significant: boolean
  leader: 'control' | 'variant' | null
  recommendation: ExperimentRecommendation
}

function armResult(counts: ArmCounts): ArmResult {
  const n = counts.impressions
  const rate = n > 0 ? counts.conversions / n : 0
  return { n, conversions: counts.conversions, rate }
}

// Standard normal CDF via the Abramowitz & Stegun 7.1.26 error-function approximation.
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2)
  const p =
    d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z > 0 ? 1 - p : p
}

export function experimentResult({
  control,
  variant
}: {
  control: ArmCounts
  variant: ArmCounts
}): ExperimentResult {
  const c = armResult(control)
  const v = armResult(variant)

  const upliftPct = c.rate > 0 ? ((v.rate - c.rate) / c.rate) * 100 : null

  let pValue: number | null = null
  if (c.n > 0 && v.n > 0) {
    const pooled = (c.conversions + v.conversions) / (c.n + v.n)
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / c.n + 1 / v.n))
    if (se > 0) {
      const z = (v.rate - c.rate) / se
      pValue = 2 * (1 - normalCdf(Math.abs(z)))
    }
  }

  const enoughData = Math.min(c.n, v.n) >= MIN_SAMPLE
  const significant = enoughData && pValue !== null && pValue < SIGNIFICANCE_LEVEL

  let leader: 'control' | 'variant' | null = null
  if (v.rate !== c.rate) leader = v.rate > c.rate ? 'variant' : 'control'

  let recommendation: ExperimentRecommendation = 'inconclusive'
  if (significant && leader === 'variant') recommendation = 'ship_variant'
  else if (significant && leader === 'control') recommendation = 'keep_control'

  return { control: c, variant: v, upliftPct, pValue, significant, leader, recommendation }
}
