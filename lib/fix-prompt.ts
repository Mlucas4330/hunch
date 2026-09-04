import { hasPlaceholders } from '@/lib/utils'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import type { FlowFix, Hypothesis, Variant } from '@/db/schema'

/**
 * The report, rewritten as an instruction for the tool that built the page.
 *
 * **The last translation the reader would otherwise do by hand.** This audience does not hand-edit
 * markup, they prompt: the page came out of Lovable, v0, Bolt or Cursor and the fixes go back in the
 * same way. Everything needed is already written by the time this runs -- the ranked changes, the
 * implementation steps, the replacement copy -- so this assembles and never generates.
 *
 * **Pure, and deliberately not a route.** It calls no model and touches no database, so it costs
 * nothing and cannot fail. That is also what makes it testable without a browser, which is the whole
 * reason the assembly lives here rather than inside the component.
 *
 * **Anything the owner has already decided about is left out**, and the two reasons differ. An
 * `applied` fix is done: repeating it tells the tool to redo work, and at worst to undo it. A
 * `dismissed` one is the owner's own judgement against shipping it, and this product holds exactly
 * one opinion about its own output -- theirs. Sending it anyway would be the prompt overruling the
 * only verdict on the page. See docs/report.md.
 *
 * **It is text, not a link and not a file.** A link would hand `embed_key` -- the report's only
 * credential -- to somebody else's model, and a PDF is both lossy and something most of these tools
 * cannot read. A block of text pastes into all of them and carries nothing the reader did not choose
 * to send. See docs/report.md.
 */

type HypothesisWithVariants = Hypothesis & { variants: Variant[] }

export type FixPromptInput = {
  url: string
  hypotheses: HypothesisWithVariants[]
  flowFixes: FlowFix[]
  dictionary: Dictionary
}

/** The line the owner published if they wrote one, otherwise what the model proposed. */
function recommended(hypothesis: HypothesisWithVariants): Variant | null {
  return (
    hypothesis.variants.find((variant) => variant.author === 'owner') ??
    hypothesis.variants[0] ??
    null
  )
}

/**
 * Builds the prompt, or returns null when there is nothing to say.
 *
 * Null rather than an empty string, so the caller renders no button at all on an analysis with
 * nothing generated -- the same contract every other section on the report has with an empty list.
 */
export function fixPrompt(input: FixPromptInput): string | null {
  const { url, hypotheses, flowFixes, dictionary } = input
  const copy = dictionary.fixPrompt
  const labels = dictionary.labels

  // Undecided is the common case and the one that belongs here: null means nobody has ruled on it
  // yet, which is different from having ruled against it.
  const pendingFixes = flowFixes.filter((fix) => fix.verdict === null)
  const undecided = hypotheses.filter((hypothesis) => hypothesis.verdict === null)

  if (undecided.length === 0 && pendingFixes.length === 0) return null

  const lines: string[] = [copy.preamble.replace('{url}', url), '']

  if (pendingFixes.length > 0) {
    lines.push(copy.changesHeading, '')

    pendingFixes.forEach((fix, index) => {
      lines.push(`${index + 1}. [${labels.flowCategory[fix.category]}] ${fix.title}`)
      lines.push(`   ${fix.problem}`)
      for (const step of fix.steps) lines.push(`   - ${step}`)
      lines.push('')
    })
  }

  // **Every replacement carries the line it replaces.** A model told only the new text has to find
  // the old one itself, and the one it picks is the one that looked closest -- which is how a
  // rewrite lands on the wrong element. `current_copy` was quoted verbatim off the page for exactly
  // this reason; see docs/ai-pipeline.md.
  const rewrites = undecided
    .map((hypothesis) => ({ hypothesis, variant: recommended(hypothesis) }))
    .filter((pair): pair is { hypothesis: HypothesisWithVariants; variant: Variant } =>
      Boolean(pair.variant)
    )

  if (rewrites.length > 0) {
    lines.push(copy.copyHeading, '')

    rewrites.forEach(({ hypothesis, variant }, index) => {
      lines.push(`${index + 1}. [${labels.section[hypothesis.section]}]`)
      lines.push(`   ${copy.from} ${JSON.stringify(hypothesis.currentCopy)}`)
      lines.push(`   ${copy.to} ${JSON.stringify(variant.copy)}`)
      if (hasPlaceholders(variant.copy)) lines.push(`   ${copy.placeholderNote}`)
      lines.push('')
    })
  }

  // **The rules go last, because the last thing in a prompt is the thing a model weighs most.**
  //
  // `placeholderRule` is the one that matters and it is conditional: a replacement carrying
  // `[brackets]` is unfinished on purpose, and a model handed one with no instruction fills it with
  // something plausible and false -- on a page that is already live. The report warns the reader
  // about exactly these lines, and a prompt that dropped the warning would be handing the risk
  // straight to the tool. See docs/report.md.
  const anyPlaceholders = rewrites.some(({ variant }) => hasPlaceholders(variant.copy))

  lines.push(copy.rulesHeading)
  if (anyPlaceholders) lines.push(`- ${copy.placeholderRule}`)
  for (const rule of copy.rules) lines.push(`- ${rule}`)

  return lines.join('\n').trim()
}
