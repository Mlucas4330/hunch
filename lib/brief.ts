import { BRIEF_FIELD, type BriefField } from '@/lib/enums'

/**
 * The brief, composed and read back.
 *
 * `analyses.brief` is one free text column and there is no plan to split it: the prompts read it as
 * prose, and four columns would be four migrations for a string that ends up concatenated anyway.
 * What changed is the question. A blank box asked the reader to guess what was useful and most of
 * them wrote nothing, so the form asks four specific things and this file is the seam between those
 * fields and the one column underneath.
 *
 * The label is written in English regardless of locale, like every other prompt input: it is read by
 * the model, never by the reader, and translating it would make the same brief parse differently
 * depending on which language the analysis happened to run in.
 */

const LABEL: Record<BriefField, string> = {
  audience: 'Audience',
  offer: 'Offer',
  action: 'Action',
  objection: 'Objection'
}

// Anchored and case sensitive: a line inside an answer that happens to start with the word "Offer"
// is prose the reader wrote, not the next field. See parseBrief.
const LINE = new RegExp(`^(${BRIEF_FIELD.map((field) => LABEL[field]).join('|')}): (.*)$`)

export type BriefParts = Record<BriefField, string>

export const EMPTY_BRIEF: BriefParts = {
  audience: '',
  offer: '',
  action: '',
  objection: ''
}

/**
 * One labelled line per answered field, blank ones left out entirely rather than emitted empty: a
 * prompt reading `Objection: ` learns nothing and spends tokens saying so.
 */
export function composeBrief(parts: BriefParts): string {
  return BRIEF_FIELD.filter((field) => parts[field].trim())
    .map((field) => `${LABEL[field]}: ${parts[field].trim()}`)
    .join('\n')
}

/**
 * The inverse, and deliberately forgiving.
 *
 * Every brief written before the form had fields is one paragraph with no labels in it, and those
 * rows are the ones already carrying real business detail. Dropping them would be the worst possible
 * trade, so anything this cannot recognise lands in `audience` unchanged and the reader edits it
 * where they can see it.
 */
export function parseBrief(text: string): BriefParts {
  const parts: BriefParts = { ...EMPTY_BRIEF }
  const trimmed = text.trim()
  if (!trimmed) return parts

  const lines = trimmed.split('\n')
  let current: BriefField | null = null

  for (const line of lines) {
    const match = LINE.exec(line)

    if (match) {
      current = BRIEF_FIELD.find((field) => LABEL[field] === match[1]) ?? null
      if (current) parts[current] = match[2].trim()
      continue
    }

    // A continuation of the field above, or -- when nothing has been labelled yet -- a legacy brief.
    const target = current ?? 'audience'
    parts[target] = parts[target] ? `${parts[target]}\n${line}` : line
    current = target
  }

  for (const field of BRIEF_FIELD) parts[field] = parts[field].trim()

  return parts
}

export function briefIsEmpty(parts: BriefParts): boolean {
  return BRIEF_FIELD.every((field) => !parts[field].trim())
}
