import Anthropic from '@anthropic-ai/sdk'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import {
  AlternateVariantsSchema,
  AnalysisOutputSchema,
  PlaybookOutputSchema,
  VisibilityOutputSchema,
  type AnalysisOutput,
  type FlowFixOutput,
  type HypothesisOutput,
  type VariantOutput,
  type VisibilityFixOutput
} from '@/lib/ai/schema'
import {
  alternateVariantsPrompt,
  competitorResearchPrompt,
  playbookPrompt,
  systemPrompt,
  visibilityPrompt
} from '@/lib/ai/prompt'
import {
  AI_OUTPUT_LANGUAGE,
  DEFAULT_LOCALE,
  MARKET_NAME,
  MARKET_SEARCH_LOCATION
} from '@/lib/constants'
import {
  FIXTURE_PERFORMANCE,
  FIXTURE_SEO,
  FIXTURE_STRUCTURE,
  fixtureAlternateVariants,
  fixtureAnalysis,
  fixturePlaybook,
  fixtureVisibility
} from '@/lib/ai/fixtures'
import { displayHost } from '@/lib/host'
import { detectMarket } from '@/lib/market'
import { fetchCrawlerAccess, type CrawlerAccess } from '@/lib/robots'
import {
  type CompetitorStructure,
  type GoalCandidate,
  type PageElement,
  type PagePerformance,
  type PageSeo,
  type PageStructure,
  goalCandidates,
  preprocessHtml,
  resolveTarget,
  scrapePage
} from '@/lib/scrape'
import { variantWordBudget, wordCount } from '@/lib/text'
import type { HypothesisTarget, Locale, Market } from '@/lib/enums'

const MODEL = 'claude-sonnet-4-6'

const RESEARCH_MODEL = 'claude-haiku-4-5'

const RESEARCH_MAX_SEARCHES = 3

const MAX_PROMPT_ELEMENTS = 150

export type AnalyzedHypothesis = HypothesisOutput & {
  selector: string | null
  target: HypothesisTarget
}

export type AnalysisResult = {
  competitors: AnalysisOutput['competitors']
  hypotheses: AnalyzedHypothesis[]
  playbook: FlowFixOutput[]
  visibility: VisibilityFixOutput[]
  goalCandidates: GoalCandidate[]
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
  competitorStructures: CompetitorStructure[]
  market: Market
  researchBrief: string
}

export type AnalyzeOptions = {
  brief?: string
  competitorUrls?: string[]
  locale?: Locale
}

export type PageMeasurement = {
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
}

export async function measurePage(url: string): Promise<PageMeasurement> {
  if (process.env.E2E_FIXTURES === '1') {
    return { structure: FIXTURE_STRUCTURE, seo: FIXTURE_SEO, performance: FIXTURE_PERFORMANCE }
  }

  const { structure, seo, performance } = await scrapePage(url)
  return { structure, seo, performance }
}

export async function analyzeLandingPage(
  url: string,
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  const locale = options.locale ?? DEFAULT_LOCALE

  if (process.env.E2E_FIXTURES === '1') {
    const analysis = fixtureAnalysis(locale)
    const fixtureMarket = detectMarket({ url, lang: FIXTURE_SEO.lang })
    const fixtureElements: PageElement[] = analysis.hypotheses.map((h, i) => ({
      text: h.current_copy,
      selector: `[data-hunch-fixture="${i}"]`,
      tag: 'p'
    }))
    fixtureElements.push({ text: 'Start free trial', selector: '[data-hunch-cta]', tag: 'a' })
    return resolveTargets({
      output: analysis,
      elements: fixtureElements,
      researchBrief: '',
      playbook: fixturePlaybook(locale),
      visibility: fixtureVisibility(locale),
      structure: FIXTURE_STRUCTURE,
      seo: FIXTURE_SEO,
      performance: FIXTURE_PERFORMANCE,
      competitorStructures: [],
      market: fixtureMarket
    })
  }

  const startedAt = Date.now()
  const { html, elements, structure, seo, performance } = await scrapePage(url)
  const content = preprocessHtml(html)
  const market = detectMarket({ url, lang: seo.lang })
  const scrapedAt = Date.now()

  const [competitorResearch, crawlerAccess] = await Promise.all([
    options.competitorUrls?.length
      ? researchProvidedCompetitors(options.competitorUrls).then(
          async (provided) => provided ?? autoResearch(content, market)
        )
      : autoResearch(content, market),
    fetchCrawlerAccess(url)
  ])
  const research = competitorResearch.brief
  const researchedAt = Date.now()

  const briefSection = options.brief
    ? `\n\nBusiness details from the founder (use these real facts to write finished copy):\n\n${options.brief}`
    : ''

  const elementList = elements
    .slice(0, MAX_PROMPT_ELEMENTS)
    .map((e) => `<${e.tag}> "${e.text}" (max ${variantWordBudget(wordCount(e.text))} words)`)
    .join('\n')
  const elementsSection = elementList
    ? `\n\nPage elements (each line is one real on-page element; current_copy must quote exactly one of these verbatim, and every variant you write for it must fit inside that element's word ceiling):\n\n${elementList}`
    : ''

  const [{ object }, playbook, visibility] = await Promise.all([
    generateObject({
      model: anthropic(MODEL),
      schema: AnalysisOutputSchema,
      maxTokens: 16000,
      system: systemPrompt(AI_OUTPUT_LANGUAGE[locale], MARKET_NAME[market]),
      prompt: `Landing page copy:\n\n${content}${elementsSection}\n\nCompetitive research brief:\n\n${research || 'No competitor research available.'}${briefSection}`
    }),
    generatePlaybook({
      structure,
      founderBrief: options.brief ?? null,
      locale,
      market
    }),
    generateVisibility({
      seo,
      structure,
      crawlerAccess,
      founderBrief: options.brief ?? null,
      locale,
      market
    })
  ])

  console.info('[analyze] timings (ms)', {
    scrape: scrapedAt - startedAt,
    research: researchedAt - scrapedAt,
    generation: Date.now() - researchedAt,
    total: Date.now() - startedAt,
    market,
    robots: crawlerAccess.status,
    playbookFixes: playbook.length,
    visibilityFixes: visibility.length
  })

  const competitors = options.competitorUrls?.length
    ? options.competitorUrls.map((competitorUrl) => ({
        name: displayHost(competitorUrl),
        url: competitorUrl
      }))
    : object.competitors

  return resolveTargets({
    output: { ...object, competitors },
    elements,
    researchBrief: research,
    playbook,
    visibility,
    structure,
    seo,
    performance,
    competitorStructures: competitorResearch.structures,
    market
  })
}

export type PlaybookInput = {
  structure: PageStructure
  founderBrief: string | null
  locale: Locale
  market: Market
}

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
      system: playbookPrompt(AI_OUTPUT_LANGUAGE[input.locale], MARKET_NAME[input.market]),
      prompt: sections.join('\n\n')
    })
    return object.fixes
  } catch (error) {
    console.error('[analyze] playbook generation failed', error)
    return []
  }
}

export type VisibilityInput = {
  seo: PageSeo
  structure: PageStructure
  crawlerAccess: CrawlerAccess
  founderBrief: string | null
  locale: Locale
  market: Market
}

export async function generateVisibility(input: VisibilityInput): Promise<VisibilityFixOutput[]> {
  if (process.env.E2E_FIXTURES === '1') {
    return fixtureVisibility(input.locale)
  }

  const sections = [
    `Metadata readout of the page (JSON):\n${JSON.stringify(input.seo, null, 2)}`,
    `Readable content on the page (JSON):\n${JSON.stringify(
      { hasFaq: input.structure.hasFaq, wordCount: input.structure.wordCount },
      null,
      2
    )}`,
    `robots.txt (JSON). A status of "unknown" means the file could not be read: it does NOT mean the
file is missing and does NOT mean anything is blocked, so say nothing about robots.txt in that
case:\n${JSON.stringify(input.crawlerAccess, null, 2)}`
  ]

  if (input.founderBrief) {
    sections.push(`Business details from the founder:\n${input.founderBrief}`)
  }

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: VisibilityOutputSchema,
      maxTokens: 3000,
      system: visibilityPrompt(AI_OUTPUT_LANGUAGE[input.locale], MARKET_NAME[input.market]),
      prompt: sections.join('\n\n')
    })
    return object.fixes
  } catch (error) {
    console.error('[analyze] visibility generation failed', error)
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
  locale: Locale
  market: Market
}

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
    system: alternateVariantsPrompt(AI_OUTPUT_LANGUAGE[input.locale], MARKET_NAME[input.market]),
    prompt: sections.join('\n\n')
  })

  object.variants.forEach((v) => warnOverLength(input.section, input.currentCopy, v.copy))

  return object.variants
}

function warnOverLength(section: string, currentCopy: string, variantCopy: string): void {
  const budget = variantWordBudget(wordCount(currentCopy))
  const actual = wordCount(variantCopy)
  if (actual <= budget) return

  console.warn('[analyze] variant over word budget', { section, budget, actual })
}

type CompetitorResearch = {
  brief: string
  structures: CompetitorStructure[]
}

async function autoResearch(pageContent: string, market: Market): Promise<CompetitorResearch> {
  return { brief: await researchCompetitors(pageContent, market), structures: [] }
}

async function researchProvidedCompetitors(urls: string[]): Promise<CompetitorResearch | null> {
  const scraped = await Promise.all(
    urls.map(async (url) => {
      try {
        const { html, structure } = await scrapePage(url)
        const name = displayHost(url)
        return {
          part: `Competitor: ${name} (${url})\n${preprocessHtml(html).slice(0, 2500)}`,
          competitor: { name, url, structure }
        }
      } catch {
        return null
      }
    })
  )

  const ok = scraped.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  if (!ok.length) return null

  return {
    brief: ok.map((entry) => entry.part).join('\n\n---\n\n'),
    structures: ok.map((entry) => entry.competitor)
  }
}

function resolveTargets(input: {
  output: AnalysisOutput
  elements: PageElement[]
  researchBrief: string
  playbook: FlowFixOutput[]
  visibility: VisibilityFixOutput[]
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
  competitorStructures: CompetitorStructure[]
  market: Market
}): AnalysisResult {
  const {
    output,
    elements,
    researchBrief,
    playbook,
    visibility,
    structure,
    seo,
    performance,
    competitorStructures,
    market
  } = input
  return {
    competitors: output.competitors,
    goalCandidates: goalCandidates(elements),
    researchBrief,
    playbook,
    visibility,
    structure,
    seo,
    performance,
    competitorStructures,
    market,
    hypotheses: output.hypotheses.map((h) => {
      const resolved = resolveTarget(h.current_copy, elements)
      h.variants.forEach((v) => warnOverLength(h.section, resolved.text ?? h.current_copy, v.copy))
      return {
        ...h,
        current_copy: resolved.text ?? h.current_copy,
        selector: resolved.selector,
        target: resolved.mode
      }
    })
  }
}

async function researchCompetitors(pageContent: string, market: Market): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return ''

  try {
    const client = new Anthropic()
    const message = await client.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: 2048,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: RESEARCH_MAX_SEARCHES,
          user_location: { type: 'approximate', ...MARKET_SEARCH_LOCATION[market] }
        }
      ],
      messages: [
        {
          role: 'user',
          content: `${competitorResearchPrompt(MARKET_NAME[market])}\n\nLanding page copy:\n\n${pageContent}`
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
