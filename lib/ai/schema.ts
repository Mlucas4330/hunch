import { z } from 'zod'
import { FLOW_CATEGORY, SECTIONS } from '@/lib/enums'
import {
  PLAYBOOK_MAX,
  PLAYBOOK_MIN,
  PLAYBOOK_STEPS_MAX,
  SECTION_FALLBACK
} from '@/lib/constants'

export const VariantSchema = z.object({
  copy: z.string(),
  evidence: z.string()
})

export const HypothesisSchema = z.object({
  // `section` only picks a badge colour, so an unrecognized value is worth exactly one mislabelled
  // pill -- while rejecting it throws away the whole analysis, every other hypothesis in it, and the
  // generation call already paid for. The enum still reaches the model (`.catch` does not strip it
  // from the JSON schema), so this is a net the model rarely needs, not a relaxed contract.
  // It catches a missing or null value too, which is why the parsed type stays a plain Section.
  section: z.enum(SECTIONS).catch(SECTION_FALLBACK),
  problem: z.string(),
  current_copy: z.string(),
  // Only the recommended challenger is generated up front -- the two alternates are written on
  // demand by POST /api/hypotheses/[id]/variants, off the analysis critical path.
  variants: z.array(VariantSchema).length(1),
  impact_score: z.number().int().min(1).max(10),
  effort_score: z.number().int().min(1).max(10),
  rationale: z.string()
})

export const CompetitorSchema = z.object({
  name: z.string(),
  url: z.string()
})

export const AnalysisOutputSchema = z.object({
  competitors: z.array(CompetitorSchema).max(4),
  hypotheses: z.array(HypothesisSchema).min(5).max(8)
})

// Generated on demand, for a hypothesis that already has its recommendation.
export const AlternateVariantsSchema = z.object({
  variants: z.array(VariantSchema).length(2)
})

// A structural fix. It has no current_copy and no variants: nothing here is a text swap, so there is
// nothing for the embed snippet to apply and nothing to A/B. What it has instead is `steps`, the
// implementation actions the founder carries out by hand.
export const FlowFixSchema = z.object({
  category: z.enum(FLOW_CATEGORY),
  title: z.string(),
  problem: z.string(),
  steps: z.array(z.string()).min(2).max(PLAYBOOK_STEPS_MAX),
  impact_score: z.number().int().min(1).max(10),
  effort_score: z.number().int().min(1).max(10),
  evidence: z.string()
})

export const PlaybookOutputSchema = z.object({
  fixes: z.array(FlowFixSchema).min(PLAYBOOK_MIN).max(PLAYBOOK_MAX)
})

export type AlternateVariantsOutput = z.infer<typeof AlternateVariantsSchema>
export type VariantOutput = z.infer<typeof VariantSchema>
export type CompetitorOutput = z.infer<typeof CompetitorSchema>
export type HypothesisOutput = z.infer<typeof HypothesisSchema>
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>
export type FlowFixOutput = z.infer<typeof FlowFixSchema>
export type PlaybookOutput = z.infer<typeof PlaybookOutputSchema>
