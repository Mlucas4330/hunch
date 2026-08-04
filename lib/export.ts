import type { Locale, Section } from '@/lib/enums'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import { formatDecimal } from '@/lib/i18n/format'
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

export function buildReportMarkdown(
  input: ReportInput,
  dictionary: Dictionary,
  locale: Locale
): string {
  const { control, variant, upliftPct, pValue, recommendation } = input.result
  const { export: e, labels } = dictionary
  const rate = (arm: { rate: number }) => `${formatDecimal(arm.rate * 100, locale, 1)}%`

  return [
    `# ${e.title}`,
    ``,
    `${e.source}: ${input.url}`,
    `${e.section}: ${labels.section[input.section]}`,
    `${e.duration}: ${input.durationDays} ${e.days}`,
    ``,
    `## ${e.recommendation}: ${labels.experimentRecommendation[recommendation]}`,
    ``,
    `**${e.problem}:** ${input.problem}`,
    ``,
    `## ${e.result}`,
    ``,
    `| ${e.arm} | ${e.copy} | ${e.conversions} | ${e.rate} |`,
    `| --- | --- | --- | --- |`,
    `| ${labels.experimentArm.control} | ${input.controlCopy} | ${control.conversions} / ${control.n} | ${rate(control)} |`,
    `| ${labels.experimentArm.variant} | ${input.variantCopy} | ${variant.conversions} / ${variant.n} | ${rate(variant)} |`,
    ``,
    `**${e.uplift}:** ${upliftPct === null ? e.notAvailable : `${formatDecimal(upliftPct, locale, 1)}%`}`,
    `**${e.pValue}:** ${pValue === null ? e.notAvailable : formatDecimal(pValue, locale, 3)}`
  ].join('\n')
}
