import { EXPERIMENT_RECOMMENDATION_LABEL, SECTION_LABEL } from '@/lib/constants'
import type { Section } from '@/lib/enums'
import type { ExperimentResult } from '@/lib/stats'

export interface ReportInput {
  url: string
  section: Section
  problem: string
  controlCopy: string
  variantCopy: string
  durationDays: number
  result: ExperimentResult
}

export function buildReportMarkdown(input: ReportInput): string {
  const { control, variant, upliftPct, pValue, recommendation } = input.result
  const rate = (arm: { rate: number }) => `${(arm.rate * 100).toFixed(1)}%`

  return [
    `# A/B test report`,
    ``,
    `Source: ${input.url}`,
    `Section: ${SECTION_LABEL[input.section]}`,
    `Duration: ${input.durationDays} days`,
    ``,
    `## Recommendation: ${EXPERIMENT_RECOMMENDATION_LABEL[recommendation]}`,
    ``,
    `**Problem:** ${input.problem}`,
    ``,
    `## Result`,
    ``,
    `| Arm | Copy | Conversions / Visitors | Rate |`,
    `| --- | --- | --- | --- |`,
    `| Control | ${input.controlCopy} | ${control.conversions} / ${control.n} | ${rate(control)} |`,
    `| Variant | ${input.variantCopy} | ${variant.conversions} / ${variant.n} | ${rate(variant)} |`,
    ``,
    `**Uplift:** ${upliftPct === null ? 'n/a' : `${upliftPct.toFixed(1)}%`}`,
    `**p-value:** ${pValue === null ? 'n/a' : pValue.toFixed(3)}`
  ].join('\n')
}
