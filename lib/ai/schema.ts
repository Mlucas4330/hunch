import { z } from 'zod'
import { SECTIONS } from '@/lib/enums'

export const HypothesisSchema = z.object({
  section: z.enum(SECTIONS),
  problem: z.string(),
  current_copy: z.string(),
  variant_copy: z.string(),
  impact_score: z.number().int().min(1).max(10),
  effort_score: z.number().int().min(1).max(10),
  rationale: z.string()
})

export const AnalysisOutputSchema = z.object({
  hypotheses: z.array(HypothesisSchema).min(5).max(8)
})

export type HypothesisOutput = z.infer<typeof HypothesisSchema>
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>
