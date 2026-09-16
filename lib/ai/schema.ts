import { z } from 'zod'
import { FLOW_FIX_CATEGORY, SECTIONS, VISIBILITY_FIX_CATEGORY } from '@/lib/enums'
import {
  HYPOTHESES_MAX,
  IMPACT_SCORE_MAX,
  IMPACT_SCORE_MIN,
  PLAYBOOK_MAX,
  PLAYBOOK_MIN,
  SECTION_FALLBACK,
  VISIBILITY_MAX
} from '@/lib/constants'

/**
 * **The key order is behaviour, not house style. Do not sort these.**
 *
 * A structured output is written in the order its fields are declared, so this object is the shape of
 * a judgement: quote the line, say what it already does, then name what is wrong with it. A model
 * that writes `problem` first argues before it has looked. `schema.test.ts` asserts the order.
 */
export const HypothesisSchema = z.object({
  section: z.enum(SECTIONS).catch(SECTION_FALLBACK),
  current_copy: z.string(),
  assessment: z.string(),
  problem: z.string(),
  impact_score: z.number().int().min(IMPACT_SCORE_MIN).max(IMPACT_SCORE_MAX),
  rationale: z.string(),
  // What the error costs the business, in one sentence. Last, because a consequence is only worth
  // stating once the line has been quoted, judged and faulted. It is still not a fix: see the
  // prompt's rule, which forbids a remedy and forbids a figure.
  business_impact: z.string()
})

// No floor: a page whose lines are doing their job comes back with none. See docs/ai-pipeline.md.
export const AnalysisOutputSchema = z.object({
  hypotheses: z.array(HypothesisSchema).max(HYPOTHESES_MAX)
})

const fixFields = {
  title: z.string(),
  problem: z.string(),
  impact_score: z.number().int().min(IMPACT_SCORE_MIN).max(IMPACT_SCORE_MAX),
  evidence: z.string(),
  // The same sentence the hypotheses carry, under the same rule. See HypothesisSchema.
  business_impact: z.string(),
  // The id of the measured finding or PageSpeed audit this error answers, or null. Checked against
  // the ids the prompt was actually given in lib/analyze.ts, so an invented one is dropped there
  // rather than rejecting the whole call here.
  finding: z.string().nullable().catch(null)
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

export type HypothesisOutput = z.infer<typeof HypothesisSchema>
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>
export type FlowFixOutput = z.infer<typeof FlowFixSchema>
export type PlaybookOutput = z.infer<typeof PlaybookOutputSchema>
export type VisibilityFixOutput = z.infer<typeof VisibilityFixSchema>
export type VisibilityOutput = z.infer<typeof VisibilityOutputSchema>

export type FixOutput = FlowFixOutput | VisibilityFixOutput
