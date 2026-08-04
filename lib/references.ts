import { db } from '@/db'
import { referencePages, type ReferencePage } from '@/db/schema'
import { REFERENCE_MAJORITY_RATIO, REFERENCE_SAMPLE_LIMIT } from '@/lib/constants'
import type { PageStructure } from '@/lib/scrape'

// One thing the corpus can say about the analysed page. `present` is how many reference pages do it,
// `total` how many were compared, so the evidence line carries a real denominator.
interface Gap {
  claim: string
  present: number
  total: number
  examples: string[]
}

type BooleanSignal = {
  [K in keyof PageStructure]: PageStructure[K] extends boolean ? K : never
}[keyof PageStructure]

// The signals worth reporting when the analysed page lacks them. Each maps to a flow fix the playbook
// can actually recommend, which is why there is no entry for things like headingCount.
const BOOLEAN_SIGNALS: { key: BooleanSignal; claim: string }[] = [
  { key: 'hasOauth', claim: 'offer social sign in (login with Google or similar)' },
  { key: 'hasFaq', claim: 'answer objections in an FAQ or Q&A block' },
  { key: 'hasPricing', claim: 'show pricing on the landing page' },
  { key: 'hasTestimonials', claim: 'show customer testimonials or quotes' },
  { key: 'hasStickyCta', claim: 'keep a call to action visible while scrolling' },
  { key: 'hasVideo', claim: 'show the product in a video or demo' }
]

// Rounded: every signal it is taken over is a count, and "5.5 calls to action" reads as a mistake.
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const value =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
  return Math.round(value)
}

function gapFor(
  signal: { key: BooleanSignal; claim: string },
  structure: PageStructure,
  corpus: ReferencePage[]
): Gap | null {
  if (structure[signal.key]) return null
  const doing = corpus.filter((page) => page.structure[signal.key])
  // Only a majority is evidence for the fix. A minority count would read as an argument against it.
  if (doing.length <= corpus.length * REFERENCE_MAJORITY_RATIO) return null
  return {
    claim: signal.claim,
    present: doing.length,
    total: corpus.length,
    examples: doing.slice(0, REFERENCE_SAMPLE_LIMIT).map((page) => page.name)
  }
}

function renderGap(gap: Gap): string {
  return `- ${gap.present} of ${gap.total} reference pages ${gap.claim} (${gap.examples.join(', ')}). This page does not.`
}

// What the corpus of real landing pages says about this one, as a prompt block. Compares only the
// signals a flow fix could act on, and only in the direction that produces a recommendation: what
// proven pages do that this page does not.
//
// Returns '' on an empty corpus or any failure. That is the whole contract the caller relies on: an
// un-ingested database costs the playbook its quantitative evidence, never the analysis itself.
export async function structuralEvidence(structure: PageStructure): Promise<string> {
  let corpus: ReferencePage[] = []
  try {
    corpus = await db.select().from(referencePages)
  } catch (error) {
    console.error('[references] corpus read failed', error)
    return ''
  }

  if (corpus.length === 0) return ''

  const lines = BOOLEAN_SIGNALS.map((signal) => gapFor(signal, structure, corpus))
    .filter((gap): gap is Gap => gap !== null)
    .map(renderGap)

  const medianFields = median(corpus.map((page) => page.structure.formFieldCount))
  if (structure.formFieldCount > medianFields && medianFields > 0) {
    lines.push(
      `- The median reference page asks for ${medianFields} form fields. This page asks for ${structure.formFieldCount}.`
    )
  }

  const medianCtas = median(corpus.map((page) => page.structure.aboveFoldCtaCount))
  if (structure.aboveFoldCtaCount > medianCtas && medianCtas > 0) {
    lines.push(
      `- The median reference page puts ${medianCtas} calls to action above the fold. This page puts ${structure.aboveFoldCtaCount}, which splits the visitor's attention.`
    )
  }

  if (lines.length === 0) return ''

  return [
    `Measured against ${corpus.length} real, shipped SaaS landing pages:`,
    ...lines
  ].join('\n')
}
