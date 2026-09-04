import { z } from 'zod'
import { FLOW_FIX_CATEGORY, READOUT_FINDING, SECTIONS, VISIBILITY_FIX_CATEGORY } from '@/lib/enums'
import {
  ALTERNATES_PER_ROUND,
  HYPOTHESES_MAX,
  IMPACT_SCORE_MAX,
  IMPACT_SCORE_MIN,
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

/**
 * **The key order is behaviour, not house style. Do not sort these.**
 *
 * A structured output is written in the order its fields are declared, so this object is the shape of
 * a judgement: quote the line, say what it already does, name what it still leaves undone, and only
 * then write the replacement. A model that has not yet composed `assessment` has nothing to weigh the
 * rewrite against, and one that writes `problem` first argues before it has looked.
 *
 * Nothing at runtime would complain if someone alphabetised them. `schema.test.ts` asserts the order
 * for that reason, and docs/ai-pipeline.md carries why each field is where it is.
 */
export const HypothesisSchema = z.object({
  section: z.enum(SECTIONS).catch(SECTION_FALLBACK),
  current_copy: z.string(),
  assessment: z.string(),
  problem: z.string(),
  variants: z.array(VariantSchema).length(1),
  impact_score: z.number().int().min(IMPACT_SCORE_MIN).max(IMPACT_SCORE_MAX),
  rationale: z.string()
})

/**
 * **There is no floor, and that is the prompt's rule rather than a concession.**
 *
 * A page whose lines are doing their job should come back with the ones that are not and nothing
 * else, and on a page where that set is empty a floor of one buys exactly one invented finding. It
 * also has to be zero to be honest downstream: `resolveTargets` drops a hypothesis whose
 * `current_copy` is on no element, so an empty list is a shape this pipeline already produces and
 * already renders. `AnalysisSections` omits a tab with no rows.
 *
 * A floor would also be in the wrong place. The three generation calls run in one `Promise.all` and
 * the other two never throw, degrading to an empty list instead, so a short hypothesis list would
 * reject this object, reject the whole `Promise.all`, and throw away up to eight flow fixes and six
 * visibility fixes that had already finished and already cost their tokens. What a credit buys is
 * checked where it can see everything that came back: the refund in lib/run-analysis.ts, which
 * triggers on nothing at all being generated.
 *
 * `HYPOTHESES_MAX` is a ceiling on cost and length, which is a different job.
 */
export const AnalysisOutputSchema = z.object({
  hypotheses: z.array(HypothesisSchema).max(HYPOTHESES_MAX)
})

export const AlternateVariantsSchema = z.object({
  variants: z.array(VariantSchema).length(ALTERNATES_PER_ROUND)
})

const fixFields = {
  title: z.string(),
  problem: z.string(),
  steps: z.array(z.string()).min(2).max(PLAYBOOK_STEPS_MAX),
  impact_score: z.number().int().min(IMPACT_SCORE_MIN).max(IMPACT_SCORE_MAX),
  evidence: z.string(),
  /**
   * Which measured finding this fix answers, or null when no measurement backs it.
   *
   * **This is what stops the readout and the fix lists being two disjoint lists about one page.**
   * The model already has the number, so it names it rather than leaving the reader to correlate
   * "form has 7 fields" with "cut the form to three" by recognising the words.
   *
   * **`.catch(null)` is not decoration.** A hallucinated id would otherwise reject the whole
   * `generateObject` call, and `generatePlaybook` swallows that in `catch -> return []`, so one bad
   * string would empty an entire tab with no error anywhere. Degrading costs one missing link; the
   * same trade `section` makes, for the same reason. See docs/ai-pipeline.md.
   */
  finding: z.enum(READOUT_FINDING).nullable().catch(null)
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

/**
 * The second pass, and **the schema is where its power is limited rather than the prompt.**
 *
 * It returns the rewrites to drop and nothing else. There is no field for a replacement, no field for
 * a score, no field for a new finding, so a critic that decides it could write a better line has
 * nowhere to put it. That is deliberate: the whole reason for a separate call is that the model which
 * just wrote a line is the worst judge of whether it was needed, and a critic allowed to rewrite is
 * the first model again under a second name.
 *
 * `reason` is never shown to anybody. It is here because a judgement with no stated grounds is the
 * one a model produces most freely, and it lands in the log where a person comparing two prompts can
 * read it. See docs/ai-pipeline.md.
 */
export const CritiqueSchema = z.object({
  drop: z
    .array(
      z.object({
        index: z.number().int(),
        reason: z.string()
      })
    )
    .max(HYPOTHESES_MAX)
})

export type CritiqueOutput = z.infer<typeof CritiqueSchema>


export type AlternateVariantsOutput = z.infer<typeof AlternateVariantsSchema>
export type VariantOutput = z.infer<typeof VariantSchema>
export type HypothesisOutput = z.infer<typeof HypothesisSchema>
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>
export type FlowFixOutput = z.infer<typeof FlowFixSchema>
export type PlaybookOutput = z.infer<typeof PlaybookOutputSchema>
export type VisibilityFixOutput = z.infer<typeof VisibilityFixSchema>
export type VisibilityOutput = z.infer<typeof VisibilityOutputSchema>

export type FixOutput = FlowFixOutput | VisibilityFixOutput
