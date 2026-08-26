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
  playbookPrompt,
  systemPrompt,
  visibilityPrompt
} from '@/lib/ai/prompt'
import { AI_OUTPUT_LANGUAGE, DEFAULT_LOCALE, MARKET_NAME } from '@/lib/constants'
import {
  FIXTURE_CRAWLER_ACCESS,
  FIXTURE_KEYWORDS,
  FIXTURE_MOBILE,
  FIXTURE_PERFORMANCE,
  FIXTURE_SEO,
  FIXTURE_STRUCTURE,
  fixtureAlternateVariants,
  fixtureAnalysis,
  fixturePlaybook,
  fixtureVisibility
} from '@/lib/ai/fixtures'
import type { CompetitorMeasurement } from '@/lib/competitor'
import { displayHost } from '@/lib/host'
import { detectMarket } from '@/lib/market'
import { fetchCrawlerAccess, type CrawlerAccess } from '@/lib/robots'
import { extractKeywords, type PageKeywords } from '@/lib/keywords'
import {
  type PageElement,
  type PageMobile,
  type PagePerformance,
  type PageSeo,
  type PageStructure,
  preprocessHtml,
  resolveTarget,
  scrapePage
} from '@/lib/scrape'
import { variantCharBudget, variantWordBudget, wordCount } from '@/lib/text'
import type { HypothesisTarget, Locale, Market } from '@/lib/enums'

const MODEL = 'claude-sonnet-4-6'

const MAX_PROMPT_ELEMENTS = 150

export type AnalyzedHypothesis = HypothesisOutput & {
  selector: string | null
  target: HypothesisTarget
}

export type AnalysisResult = {
  hypotheses: AnalyzedHypothesis[]
  playbook: FlowFixOutput[]
  visibility: VisibilityFixOutput[]
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
  crawlerAccess: CrawlerAccess
  keywords: PageKeywords
  mobile: PageMobile
  market: Market
  competitor: CompetitorMeasurement | null
}

export type AnalyzeOptions = {
  brief?: string
  locale?: Locale
  competitorUrl?: string | null
}

export type PageMeasurement = {
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
  crawlerAccess: CrawlerAccess
  keywords: PageKeywords
  mobile: PageMobile
}

// The page's own words, counted the same way from both entry points.
function keywordsFor(html: string, seo: PageSeo): PageKeywords {
  return extractKeywords({
    text: preprocessHtml(html),
    title: seo.title,
    metaDescription: seo.metaDescription,
    headings: seo.headings ?? []
  })
}

/**
 * The second page, measured by the same code as the first.
 *
 * **It lives here rather than in lib/competitor.ts because it touches the browser.** That module is
 * imported by MeasuredReadout, a client component, so a value import of `scrapePage` there would pull
 * puppeteer into the browser bundle. Everything pure about a competitor stays there; the scrape stays
 * on this side of the line.
 */
export async function measureCompetitor(url: string): Promise<CompetitorMeasurement> {
  const { html, structure, seo, performance, mobile } = await scrapePage(url)

  return { url, structure, seo, performance, mobile, keywords: keywordsFor(html, seo) }
}

export async function measurePage(url: string): Promise<PageMeasurement> {
  if (process.env.E2E_FIXTURES === '1') {
    return {
      structure: FIXTURE_STRUCTURE,
      seo: FIXTURE_SEO,
      performance: FIXTURE_PERFORMANCE,
      crawlerAccess: FIXTURE_CRAWLER_ACCESS,
      keywords: FIXTURE_KEYWORDS,
      mobile: FIXTURE_MOBILE
    }
  }

  const [{ html, structure, seo, performance, mobile }, crawlerAccess] = await Promise.all([
    scrapePage(url),
    fetchCrawlerAccess(url)
  ])

  return { structure, seo, performance, crawlerAccess, mobile, keywords: keywordsFor(html, seo) }
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
      tag: 'p',
      capacity: variantCharBudget(h.current_copy),
      emphasized: false
    }))
    fixtureElements.push({
      text: 'Start free trial',
      selector: '[data-ab-goal]',
      tag: 'a',
      capacity: variantCharBudget('Start free trial'),
      emphasized: false
    })
    return resolveTargets({
      output: analysis,
      elements: fixtureElements,
      playbook: fixturePlaybook(locale),
      visibility: fixtureVisibility(locale),
      structure: FIXTURE_STRUCTURE,
      seo: FIXTURE_SEO,
      performance: FIXTURE_PERFORMANCE,
      crawlerAccess: FIXTURE_CRAWLER_ACCESS,
      keywords: FIXTURE_KEYWORDS,
      mobile: FIXTURE_MOBILE,
      market: fixtureMarket,
      competitor: null
    })
  }

  const startedAt = Date.now()

  // **Three independent waits, taken together.** `fetchCrawlerAccess` used to run after the scrape
  // and depended on nothing in it, so it spent its whole budget in series for no reason. The
  // competitor scrape joins them: `scrapePage` waits for its own browser slot, and the drain is
  // serial, so an analysis holds at most two of SCRAPE_MAX_CONCURRENT_PAGES.
  const [
    { html, elements, structure, seo, performance, mobile },
    crawlerAccess,
    competitor
  ] = await Promise.all([
    scrapePage(url),
    fetchCrawlerAccess(url),
    options.competitorUrl ? measureCompetitor(options.competitorUrl) : Promise.resolve(null)
  ])

  const content = preprocessHtml(html)
  const market = detectMarket({ url, lang: seo.lang })
  const keywords = keywordsFor(html, seo)
  const measuredAt = Date.now()

  const competitorHost = competitor ? displayHost(competitor.url) : null
  const competitorSection = competitor
    ? `\n\nReadout of ${competitorHost}, a second page the reader pointed at, counted by this same code (JSON). Every number in it is a measurement of that one page and of nothing else:\n${JSON.stringify(
        { structure: competitor.structure, seo: competitor.seo, performance: competitor.performance },
        null,
        2
      )}`
    : ''

  const briefSection = options.brief
    ? `\n\nBusiness details from the founder (use these real facts to write finished copy):\n\n${options.brief}`
    : ''

  const elementList = elements
    .slice(0, MAX_PROMPT_ELEMENTS)
    .map(
      (e) =>
        `<${e.tag}> "${e.text}" (max ${variantWordBudget(wordCount(e.text))} words, max ${e.capacity} characters${e.emphasized ? ', styled fragment' : ''})`
    )
    .join('\n')
  const elementsSection = elementList
    ? `\n\nPage elements (each line is one real on-page element; current_copy must quote exactly one of these verbatim, and every variant you write for it must fit inside that element's word ceiling AND its character ceiling. The character ceiling is the measured width of the box that element occupies on the page: copy past it is cut off by the site's own CSS, not merely long):\n\n${elementList}`
    : ''

  const [{ object }, playbook, visibility] = await Promise.all([
    generateObject({
      model: anthropic(MODEL),
      schema: AnalysisOutputSchema,
      maxTokens: 16000,
      system: systemPrompt(AI_OUTPUT_LANGUAGE[locale], MARKET_NAME[market], competitorHost),
      prompt: `Landing page copy:\n\n${content}${elementsSection}${briefSection}${competitorSection}`
    }),
    generatePlaybook({
      structure,
      founderBrief: options.brief ?? null,
      locale,
      market,
      competitor
    }),
    generateVisibility({
      seo,
      structure,
      crawlerAccess,
      keywords,
      founderBrief: options.brief ?? null,
      locale,
      market
    })
  ])

  console.info('[analyze] timings (ms)', {
    measure: measuredAt - startedAt,
    generation: Date.now() - measuredAt,
    total: Date.now() - startedAt,
    market,
    robots: crawlerAccess.status,
    competitor: competitorHost,
    playbookFixes: playbook.length,
    visibilityFixes: visibility.length
  })

  return resolveTargets({
    output: object,
    elements,
    playbook,
    visibility,
    structure,
    seo,
    performance,
    crawlerAccess,
    keywords,
    mobile,
    market,
    competitor
  })
}

export type PlaybookInput = {
  structure: PageStructure
  founderBrief: string | null
  locale: Locale
  market: Market
  competitor?: CompetitorMeasurement | null
}

export async function generatePlaybook(input: PlaybookInput): Promise<FlowFixOutput[]> {
  if (process.env.E2E_FIXTURES === '1') {
    return fixturePlaybook(input.locale)
  }

  const sections = [
    `Structural readout of the page (JSON):\n${JSON.stringify(input.structure, null, 2)}`
  ]

  const competitorHost = input.competitor ? displayHost(input.competitor.url) : null
  if (input.competitor) {
    sections.push(
      `Structural readout of ${competitorHost}, a second page the reader pointed at, counted by this same code (JSON). Every number in it is a measurement of that one page and of nothing else:\n${JSON.stringify(
        input.competitor.structure,
        null,
        2
      )}`
    )
  }

  if (input.founderBrief) {
    sections.push(`Business details from the founder:\n${input.founderBrief}`)
  }

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: PlaybookOutputSchema,
      maxTokens: 3000,
      system: playbookPrompt(
        AI_OUTPUT_LANGUAGE[input.locale],
        MARKET_NAME[input.market],
        competitorHost
      ),
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
  keywords: PageKeywords
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
case:\n${JSON.stringify(input.crawlerAccess, null, 2)}`,
    `Terms the page itself repeats, counted on the page, with where each one already appears. These
are the page's own words, NOT search volume and NOT a ranking opportunity: never state how often
anyone searches for one, and never promise a position:\n${JSON.stringify(
      input.keywords.terms,
      null,
      2
    )}`
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
  // Whether the target element has a styled fragment at all. The element list is long gone by now,
  // so it is inferred from the recommendation having chosen an emphasis.
  emphasized: boolean
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
    `Word ceiling: the current copy is ${wordCount(input.currentCopy)} words. Every alternate must be ${variantWordBudget(wordCount(input.currentCopy))} words or fewer, and ${variantCharBudget(input.currentCopy)} characters or fewer. Copy past the character ceiling is cut off by the site's own CSS.`,
    input.emphasized
      ? 'This element has a styled fragment, so set emphasis on every alternate.'
      : 'This element has no styled fragment, so set emphasis to null on every alternate.'
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

function resolveTargets(input: {
  output: AnalysisOutput
  elements: PageElement[]
  playbook: FlowFixOutput[]
  visibility: VisibilityFixOutput[]
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
  crawlerAccess: CrawlerAccess
  keywords: PageKeywords
  mobile: PageMobile
  market: Market
  competitor: CompetitorMeasurement | null
}): AnalysisResult {
  const {
    output,
    elements,
    playbook,
    visibility,
    structure,
    seo,
    performance,
    crawlerAccess,
    keywords,
    mobile,
    market,
    competitor
  } = input
  return {
    playbook,
    visibility,
    structure,
    seo,
    performance,
    crawlerAccess,
    keywords,
    mobile,
    market,
    competitor,
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
