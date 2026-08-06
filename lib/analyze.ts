import Anthropic from '@anthropic-ai/sdk'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import {
  AlternateVariantsSchema,
  AnalysisOutputSchema,
  PlaybookOutputSchema,
  type AnalysisOutput,
  type FlowFixOutput,
  type HypothesisOutput,
  type VariantOutput
} from '@/lib/ai/schema'
import {
  COMPETITOR_RESEARCH_PROMPT,
  alternateVariantsPrompt,
  playbookPrompt,
  systemPrompt
} from '@/lib/ai/prompt'
import { AI_OUTPUT_LANGUAGE, DEFAULT_LOCALE } from '@/lib/constants'
import {
  FIXTURE_STRUCTURE,
  fixtureAlternateVariants,
  fixtureAnalysis,
  fixturePlaybook
} from '@/lib/ai/fixtures'
import {
  type GoalCandidate,
  type PageElement,
  type PageStructure,
  goalCandidates,
  preprocessHtml,
  resolveTarget,
  scrapePage
} from '@/lib/scrape'
import { variantWordBudget, wordCount } from '@/lib/text'
import type { HypothesisTarget, Locale } from '@/lib/enums'

// The hypotheses are the core IP -- they stay on Sonnet.
const MODEL = 'claude-sonnet-4-6'

// Competitor research is search-and-summarize, not strategy, so it runs on the fast model. Haiku
// rejects the `effort` parameter and only supports the basic web_search_20250305 tool variant,
// both of which the call below already respects.
const RESEARCH_MODEL = 'claude-haiku-4-5'

// Each use is a serial search round trip and COMPETITOR_RESEARCH_PROMPT only asks for 2-3
// competitors, so more uses buy latency rather than coverage.
const RESEARCH_MAX_SEARCHES = 3

// Cap the element list passed to generation so it grounds targeting without blowing the token budget.
const MAX_PROMPT_ELEMENTS = 150

export type AnalyzedHypothesis = HypothesisOutput & {
  selector: string | null
  target: HypothesisTarget
}

export type AnalysisResult = {
  competitors: AnalysisOutput['competitors']
  hypotheses: AnalyzedHypothesis[]
  // Structural fixes, generated alongside the hypotheses. Empty when the playbook generation failed:
  // it is an addition to the analysis, never a precondition for it.
  playbook: FlowFixOutput[]
  goalCandidates: GoalCandidate[]
  structure: PageStructure
  // Persisted so the on-demand alternates call is grounded in the same competitor research
  // without paying for a second web search.
  researchBrief: string
}

export type AnalyzeOptions = {
  brief?: string
  competitorUrls?: string[]
  // The language the hypotheses and variant copy are written in. Defaults to the app default so a
  // caller that does not care still gets a well-defined output language.
  locale?: Locale
}

export async function analyzeLandingPage(
  url: string,
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  // The fixture path resolves its language the same way the real path below does, so E2E_FIXTURES is
  // never the one branch that ignores the locale the user is reading the app in.
  const locale = options.locale ?? DEFAULT_LOCALE

  if (process.env.E2E_FIXTURES === '1') {
    const analysis = fixtureAnalysis(locale)
    // Synthesize one element per fixture hypothesis so its current_copy resolves to `auto` (the
    // fixtures represent an idealized clean page), keeping the deterministic launch-a-test flow live.
    const fixtureElements: PageElement[] = analysis.hypotheses.map((h, i) => ({
      text: h.current_copy,
      selector: `[data-hunch-fixture="${i}"]`,
      tag: 'p'
    }))
    // One clickable element so the goal picker has something to offer in the e2e flow.
    fixtureElements.push({ text: 'Start free trial', selector: '[data-hunch-cta]', tag: 'a' })
    return resolveTargets({
      output: analysis,
      elements: fixtureElements,
      researchBrief: '',
      playbook: fixturePlaybook(locale),
      structure: FIXTURE_STRUCTURE
    })
  }

  const startedAt = Date.now()
  const { html, elements, structure } = await scrapePage(url)
  const content = preprocessHtml(html)
  const scrapedAt = Date.now()

  // Paid "Competitor mode": ground on the pages the user supplied instead of auto web-search.
  const provided = options.competitorUrls?.length
    ? await researchProvidedCompetitors(options.competitorUrls)
    : null
  const research = provided ?? (await researchCompetitors(content))
  const researchedAt = Date.now()

  const briefSection = options.brief
    ? `\n\nBusiness details from the founder (use these real facts to write finished copy):\n\n${options.brief}`
    : ''

  const elementList = elements
    .slice(0, MAX_PROMPT_ELEMENTS)
    // Angle brackets, not parens: a bare `(h2)` beside the copy reads as a label for it, and the
    // model has put the tag straight into `section` because of it.
    .map((e) => `<${e.tag}> "${e.text}" (max ${variantWordBudget(wordCount(e.text))} words)`)
    .join('\n')
  const elementsSection = elementList
    ? `\n\nPage elements (each line is one real on-page element; current_copy must quote exactly one of these verbatim, and every variant you write for it must fit inside that element's word ceiling):\n\n${elementList}`
    : ''

  // Run in parallel: the playbook is a second, much smaller generation over the structural readout,
  // so it costs no additional latency on the critical path.
  const [{ object }, playbook] = await Promise.all([
    generateObject({
      model: anthropic(MODEL),
      schema: AnalysisOutputSchema,
      maxTokens: 16000,
      system: systemPrompt(AI_OUTPUT_LANGUAGE[locale]),
      prompt: `Landing page copy:\n\n${content}${elementsSection}\n\nCompetitive research brief:\n\n${research || 'No competitor research available.'}${briefSection}`
    }),
    generatePlaybook({
      structure,
      founderBrief: options.brief ?? null,
      locale
    })
  ])

  // The stage split is what the loader's progress labels are paced against, so it has to be
  // observable when the pipeline changes.
  console.info('[analyze] timings (ms)', {
    scrape: scrapedAt - startedAt,
    research: researchedAt - scrapedAt,
    generation: Date.now() - researchedAt,
    total: Date.now() - startedAt,
    playbookFixes: playbook.length
  })

  const competitors = options.competitorUrls?.length
    ? options.competitorUrls.map((competitorUrl) => ({
        name: hostnameOf(competitorUrl),
        url: competitorUrl
      }))
    : object.competitors

  return resolveTargets({
    output: { ...object, competitors },
    elements,
    researchBrief: research,
    playbook,
    structure
  })
}

export type PlaybookInput = {
  structure: PageStructure
  founderBrief: string | null
  locale: Locale
}

// The flow playbook: structural fixes derived from what the page already does. Resolves to [] on any
// failure -- a founder losing the playbook is a smaller cost than losing the whole analysis, so this
// never rejects into the caller's Promise.all.
export async function generatePlaybook(input: PlaybookInput): Promise<FlowFixOutput[]> {
  if (process.env.E2E_FIXTURES === '1') {
    return fixturePlaybook(input.locale)
  }

  const sections = [
    `Structural readout of the page (JSON):\n${JSON.stringify(input.structure, null, 2)}`
  ]

  if (input.founderBrief) {
    sections.push(`Business details from the founder:\n${input.founderBrief}`)
  }

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: PlaybookOutputSchema,
      maxTokens: 3000,
      system: playbookPrompt(AI_OUTPUT_LANGUAGE[input.locale]),
      prompt: sections.join('\n\n')
    })
    return object.fixes
  } catch (error) {
    console.error('[analyze] playbook generation failed', error)
    return []
  }
}

export type AlternateVariantsInput = {
  section: string
  problem: string
  currentCopy: string
  rationale: string
  recommendedCopy: string
  researchBrief: string | null
  founderBrief: string | null
  // Pinned to the analysis, not the current UI language, so alternates match the hypotheses they
  // sit next to even if the user switched languages after running the analysis.
  locale: Locale
}

// Writes the two alternates a hypothesis was not given during the analysis. Grounded in the stored
// research brief rather than a fresh web search, so it costs one small generation and nothing else.
export async function generateAlternateVariants(
  input: AlternateVariantsInput
): Promise<VariantOutput[]> {
  if (process.env.E2E_FIXTURES === '1') {
    return fixtureAlternateVariants(input.locale)
  }

  const sections = [
    `Section: ${input.section}`,
    `Current copy on the page:\n${input.currentCopy}`,
    `Problem with it:\n${input.problem}`,
    `Why the challenger should win:\n${input.rationale}`,
    `The recommended challenger (write different angles, do not paraphrase this):\n${input.recommendedCopy}`,
    // The element list never reaches this call, so the ceiling the analysis prompt reads off each
    // line is computed here from the same formula. An alternate is held to exactly the standard the
    // recommendation it sits beside was held to.
    `Word ceiling: the current copy is ${wordCount(input.currentCopy)} words. Every alternate must be ${variantWordBudget(wordCount(input.currentCopy))} words or fewer.`,
    `Competitive research brief:\n${input.researchBrief || 'No competitor research available.'}`
  ]

  if (input.founderBrief) {
    sections.push(
      `Business details from the founder (use these real facts to write finished copy):\n${input.founderBrief}`
    )
  }

  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: AlternateVariantsSchema,
    maxTokens: 2000,
    system: alternateVariantsPrompt(AI_OUTPUT_LANGUAGE[input.locale]),
    prompt: sections.join('\n\n')
  })

  object.variants.forEach((v) => warnOverLength(input.section, input.currentCopy, v.copy))

  return object.variants
}

// Deliberately log-only. A zod .max() on copy would fail the whole 16k-token generation with no
// retry wrapper, turning one long headline into an opaque 500 that costs the user the entire
// analysis; truncating would ship a headline cut mid-clause to a prospect on the public report; and
// regenerating puts a second Sonnet call on the critical path for a soft rule. Logging makes the
// prompt's ceiling measurable in production, which is what has to come before escalating it.
function warnOverLength(section: string, currentCopy: string, variantCopy: string): void {
  const budget = variantWordBudget(wordCount(currentCopy))
  const actual = wordCount(variantCopy)
  if (actual <= budget) return

  console.warn('[analyze] variant over word budget', { section, budget, actual })
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// Builds a competitor brief from user-supplied landing pages (scrape + clean, no web search).
// Degrades to null so generation can fall back to the auto research path.
async function researchProvidedCompetitors(urls: string[]): Promise<string | null> {
  // Scraped concurrently: these are independent pages, and serially they cost one cold browser
  // boot each. A failed URL drops out of the brief instead of failing the batch.
  const scraped = await Promise.all(
    urls.map(async (url) => {
      try {
        const { html } = await scrapePage(url)
        return `Competitor: ${hostnameOf(url)} (${url})\n${preprocessHtml(html).slice(0, 2500)}`
      } catch {
        return null
      }
    })
  )

  const parts = scraped.filter((part): part is string => part !== null)
  return parts.length ? parts.join('\n\n---\n\n') : null
}

function resolveTargets(input: {
  output: AnalysisOutput
  elements: PageElement[]
  researchBrief: string
  playbook: FlowFixOutput[]
  structure: PageStructure
}): AnalysisResult {
  const { output, elements, researchBrief, playbook, structure } = input
  return {
    competitors: output.competitors,
    goalCandidates: goalCandidates(elements),
    researchBrief,
    playbook,
    structure,
    hypotheses: output.hypotheses.map((h) => {
      const resolved = resolveTarget(h.current_copy, elements)
      // Measured against the resolved on-page text, which is the copy the variant actually replaces.
      h.variants.forEach((v) => warnOverLength(h.section, resolved.text ?? h.current_copy, v.copy))
      return {
        ...h,
        // Snap current_copy to the matched element's real on-page text so the report shows exactly
        // what a visitor sees, never a paraphrase or a merge of adjacent elements.
        current_copy: resolved.text ?? h.current_copy,
        selector: resolved.selector,
        target: resolved.mode
      }
    })
  }
}

// Uses the official Anthropic SDK's web search server tool to find and read competitor
// landing pages. Degrades gracefully (returns '') so generation still succeeds without it.
async function researchCompetitors(pageContent: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return ''

  try {
    const client = new Anthropic()
    const message = await client.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: 2048,
      tools: [
        { type: 'web_search_20250305', name: 'web_search', max_uses: RESEARCH_MAX_SEARCHES }
      ],
      messages: [
        {
          role: 'user',
          content: `${COMPETITOR_RESEARCH_PROMPT}\n\nLanding page copy:\n\n${pageContent}`
        }
      ]
    })

    return message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()
  } catch {
    return ''
  }
}
