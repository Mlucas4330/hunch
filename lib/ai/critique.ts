import type { CritiqueOutput, HypothesisOutput } from '@/lib/ai/schema'

/**
 * What the second pass is allowed to do to the first one's output.
 *
 * **Removal only, and it is code that removes.** The critic answers with indexes; nothing it says is
 * ever written into a hypothesis, so a critic that has opinions about wording has no route to the
 * reader. It is the same shape as `resolveTargets`: the prompt asks, and the check happens on the way
 * back, because prompt instruction has not held behaviour in this pipeline and code reading output
 * has. See docs/ai-pipeline.md.
 *
 * **Anything it does not mention is kept.** Silence is agreement, so a truncated or partial answer
 * costs nothing, and only an explicit drop removes anything.
 */
export function applyCritique(
  hypotheses: HypothesisOutput[],
  critique: CritiqueOutput
): { kept: HypothesisOutput[]; dropped: { copy: string; reason: string }[] } {
  const dropped: { copy: string; reason: string }[] = []
  // Indexes are 1-based, because that is how the list was numbered in the prompt. An index naming no
  // rewrite is ignored rather than shifting the list by one.
  const reasons = new Map<number, string>()

  for (const entry of critique.drop) {
    if (entry.index >= 1 && entry.index <= hypotheses.length) reasons.set(entry.index, entry.reason)
  }

  const kept = hypotheses.filter((hypothesis, position) => {
    const reason = reasons.get(position + 1)
    if (reason === undefined) return true

    dropped.push({ copy: hypothesis.current_copy, reason })
    return false
  })

  return { kept, dropped }
}

/** The numbered list the critic reads. One block per rewrite, and nothing it could edit in place. */
export function critiqueInput(hypotheses: HypothesisOutput[]): string {
  return hypotheses
    .map((hypothesis, position) =>
      [
        `${position + 1}. [${hypothesis.section}]`,
        `   current: ${hypothesis.current_copy}`,
        `   proposed: ${hypothesis.variants[0]?.copy ?? ''}`,
        `   their reasoning: ${hypothesis.rationale}`
      ].join('\n')
    )
    .join('\n\n')
}
