import { z } from 'zod'
import { FLOW_FIX_CATEGORY, SECTIONS, VISIBILITY_FIX_CATEGORY } from '@/lib/enums'
import {
  PLAYBOOK_MAX,
  PLAYBOOK_MIN,
  PLAYBOOK_STEPS_MAX,
  SECTION_FALLBACK,
  VISIBILITY_MAX
} from '@/lib/constants'

export const VariantSchema = z.object({
  copy: z.string(),
  evidence: z.string(),
  // A substring of this variant's own `copy`, or null. Never a substring of current_copy: it names
  // what deserves emphasis in the new line, not what carried it in the old one. See docs/ai-pipeline.md.
  emphasis: z.string().nullable()
})

export const HypothesisSchema = z.object({
  section: z.enum(SECTIONS).catch(SECTION_FALLBACK),
  problem: z.string(),
  current_copy: z.string(),
  variants: z.array(VariantSchema).length(1),
  impact_score: z.number().int().min(1).max(10),
  rationale: z.string()
})

export const AnalysisOutputSchema = z.object({
  hypotheses: z.array(HypothesisSchema).min(5).max(8)
})

export const AlternateVariantsSchema = z.object({
  variants: z.array(VariantSchema).length(2)
})

const fixFields = {
  title: z.string(),
  problem: z.string(),
  steps: z.array(z.string()).min(2).max(PLAYBOOK_STEPS_MAX),
  impact_score: z.number().int().min(1).max(10),
  evidence: z.string()
}

export const FlowFixSchema = z.object({
  category: z.enum(FLOW_FIX_CATEGORY),
  ...fixFields
})

export const PlaybookOutputSchema = z.object({
  fixes: z.array(FlowFixSchema).min(PLAYBOOK_MIN).max(PLAYBOOK_MAX)
})

export const VisibilityFixSchema = z.object({
  category: z.enum(VISIBILITY_FIX_CATEGORY),
  ...fixFields
})

export const VisibilityOutputSchema = z.object({
  fixes: z.array(VisibilityFixSchema).max(VISIBILITY_MAX)
})

export type AlternateVariantsOutput = z.infer<typeof AlternateVariantsSchema>
export type VariantOutput = z.infer<typeof VariantSchema>
export type HypothesisOutput = z.infer<typeof HypothesisSchema>
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>
export type FlowFixOutput = z.infer<typeof FlowFixSchema>
export type PlaybookOutput = z.infer<typeof PlaybookOutputSchema>
export type VisibilityFixOutput = z.infer<typeof VisibilityFixSchema>
export type VisibilityOutput = z.infer<typeof VisibilityOutputSchema>

export type FixOutput = FlowFixOutput | VisibilityFixOutput
