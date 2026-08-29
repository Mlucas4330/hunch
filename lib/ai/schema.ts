import { z } from 'zod'
import { FLOW_FIX_CATEGORY, READOUT_FINDING, SECTIONS, VISIBILITY_FIX_CATEGORY } from '@/lib/enums'
import {
  AD_DESCRIPTION_MAX_CHARS,
  AD_DESCRIPTIONS_PER_GROUP,
  AD_GROUPS_MAX,
  AD_GROUPS_MIN,
  AD_HEADLINE_MAX_CHARS,
  AD_HEADLINES_PER_GROUP,
  AD_NEGATIVES_MAX,
  AD_TERMS_PER_GROUP_MAX,
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
  evidence: z.string(),
  /**
   * Which measured finding this fix answers, or null when no measurement backs it.
   *
   * **This is what stops the readout and the fix lists being two disjoint lists about one page.**
   * The reader used to correlate "form has 7 fields" with "cut the form to three" by recognising the
   * words; the model already had the number, and the reference was thrown away on the way back.
   *
   * **`.catch(null)` is not decoration.** A hallucinated id would otherwise reject the whole
   * `generateObject` call, and `generatePlaybook` swallows that in `catch -> return []` — so one bad
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
 * Ad groups written off the terms this code counted on the page.
 *
 * **The character limits are Google's and they are hard.** A 40 character headline is rejected at
 * upload, so copy past the ceiling is copy the reader cannot use -- the same reasoning that makes a
 * variant's word ceiling a constraint rather than a preference. `.max()` here means one over-long
 * headline fails the whole call, which `generateAdIdeas` swallows into `null`; that is the right
 * trade, because half a set of unusable headlines is worse than an empty section with a retry.
 *
 * **`terms` is not free text.** Every entry must be one of the terms the reader can see in the table
 * right above the section, which is what keeps this from turning into a keyword planner inventing
 * words the page never used. The prompt states it; nothing in Zod can check it, so
 * `generateAdIdeas` filters the result against the measured terms on the way back.
 */
export const AdGroupSchema = z.object({
  theme: z.string(),
  terms: z.array(z.string()).min(1).max(AD_TERMS_PER_GROUP_MAX),
  headlines: z.array(z.string().max(AD_HEADLINE_MAX_CHARS)).length(AD_HEADLINES_PER_GROUP),
  descriptions: z
    .array(z.string().max(AD_DESCRIPTION_MAX_CHARS))
    .length(AD_DESCRIPTIONS_PER_GROUP)
})

export const AdIdeasSchema = z.object({
  groups: z.array(AdGroupSchema).min(AD_GROUPS_MIN).max(AD_GROUPS_MAX),
  negatives: z.array(z.string()).max(AD_NEGATIVES_MAX)
})

export type AdGroup = z.infer<typeof AdGroupSchema>
export type AdIdeas = z.infer<typeof AdIdeasSchema>

export type AlternateVariantsOutput = z.infer<typeof AlternateVariantsSchema>
export type VariantOutput = z.infer<typeof VariantSchema>
export type HypothesisOutput = z.infer<typeof HypothesisSchema>
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>
export type FlowFixOutput = z.infer<typeof FlowFixSchema>
export type PlaybookOutput = z.infer<typeof PlaybookOutputSchema>
export type VisibilityFixOutput = z.infer<typeof VisibilityFixSchema>
export type VisibilityOutput = z.infer<typeof VisibilityOutputSchema>

export type FixOutput = FlowFixOutput | VisibilityFixOutput
