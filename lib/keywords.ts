import {
  KEYWORD_MAX_WORDS,
  KEYWORD_MIN_COUNT,
  KEYWORD_STOPWORDS,
  KEYWORD_TERMS_MAX
} from '@/lib/constants'

export type KeywordTerm = {
  term: string
  count: number
  inTitle: boolean
  inH1: boolean
  inMetaDescription: boolean
  inHeadings: boolean
}

export type PageKeywords = {
  terms: KeywordTerm[]
  totalWords: number
}

export type KeywordInput = {
  text: string
  title: string | null
  metaDescription: string | null
  headings: string[]
}

const STOPWORDS = new Set(KEYWORD_STOPWORDS)

// Letters of any script plus digits, so acentos survive and punctuation does not.
const WORD_PATTERN = /[\p{L}\p{N}]+/gu

function words(text: string): string[] {
  return (text.toLowerCase().match(WORD_PATTERN) ?? []).filter((word) => word.length > 1)
}

function isCandidate(parts: string[]): boolean {
  // A phrase may pass through a stopword, but never start or end on one: "page for the pricing"
  // is not a term, "landing page" is.
  return !STOPWORDS.has(parts[0]) && !STOPWORDS.has(parts[parts.length - 1])
}

export function extractKeywords(input: KeywordInput): PageKeywords {
  const tokens = words(input.text)
  const counts = new Map<string, number>()

  for (let size = 1; size <= KEYWORD_MAX_WORDS; size++) {
    for (let i = 0; i + size <= tokens.length; i++) {
      const parts = tokens.slice(i, i + size)
      if (!isCandidate(parts)) continue

      const term = parts.join(' ')
      counts.set(term, (counts.get(term) ?? 0) + 1)
    }
  }

  const title = words(input.title ?? '').join(' ')
  const metaDescription = words(input.metaDescription ?? '').join(' ')
  const headings = input.headings.map((heading) => words(heading).join(' '))
  const h1 = headings[0] ?? ''

  const terms = Array.from(counts.entries())
    .filter(([, count]) => count >= KEYWORD_MIN_COUNT)
    // Longer first on a tie: a bigram says more about the page than either word alone.
    .sort(([aTerm, aCount], [bTerm, bCount]) => bCount - aCount || bTerm.length - aTerm.length)
    .slice(0, KEYWORD_TERMS_MAX)
    .map(([term, count]) => ({
      term,
      count,
      inTitle: contains(title, term),
      inH1: contains(h1, term),
      inMetaDescription: contains(metaDescription, term),
      inHeadings: headings.some((heading) => contains(heading, term))
    }))

  return { terms, totalWords: tokens.length }
}

function contains(haystack: string, term: string): boolean {
  if (haystack.length === 0) return false
  return ` ${haystack} `.includes(` ${term} `)
}
