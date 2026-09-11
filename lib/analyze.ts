import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import {
  AnalysisOutputSchema,
  PlaybookOutputSchema,
  VisibilityOutputSchema,
  type AnalysisOutput,
  type FixOutput,
  type FlowFixOutput,
  type HypothesisOutput,
  type VisibilityFixOutput
} from '@/lib/ai/schema'
import { playbookPrompt, systemPrompt, visibilityPrompt } from '@/lib/ai/prompt'
import {
  AI_OUTPUT_LANGUAGE,
  DEFAULT_LOCALE,
  MARKET_NAME,
  NEIGHBOUR_TEXT_MAX_CHARS,
  PAGESPEED_CATEGORY_BY_FIX_KIND
} from '@/lib/constants'
import {
  FIXTURE_CRAWLER_ACCESS,
  FIXTURE_KEYWORDS,
  FIXTURE_MOBILE,
  FIXTURE_PAGESPEED,
  FIXTURE_PERFORMANCE,
  FIXTURE_SEO,
  FIXTURE_STRUCTURE,
  FIXTURE_SAMENESS,
  fixtureAnalysis,
  fixturePlaybook,
  fixtureVisibility
} from '@/lib/ai/fixtures'
import type { CompetitorMeasurement } from '@/lib/competitor'
import { displayHost } from '@/lib/host'
import { detectMarket } from '@/lib/market'
import { fetchCrawlerAccess, type CrawlerAccess } from '@/lib/robots'
import { extractKeywords, type PageKeywords } from '@/lib/keywords'
import { composePageText, coverageNote, type ComposedPageText } from '@/lib/page-text'
import { fetchPageSpeed, type PageSpeed } from '@/lib/pagespeed'
import { promptElements, resolveTarget } from '@/lib/prompt-elements'
import { pickNeighbours } from '@/lib/site-pages'
import {
  type PageElement,
  type PageLink,
  type PageMobile,
  type PageSameness,
  type PagePerformance,
  type PageSection,
  type PageSeo,
  type PageStructure,
  preprocessHtml,
  scrapePage,
  scrapePageText
} from '@/lib/scrape'
import { measuredFindings, type MeasuredFinding } from '@/lib/readout'
import type {
  HypothesisTarget,
  Locale,
  Market,
  PageSpeedCategory,
  ReadoutGroup
} from '@/lib/enums'

const MODEL = 'claude-sonnet-4-6'

export type AnalyzedHypothesis = HypothesisOutput & {
  selector: string | null
  target: HypothesisTarget
}

export type AnalysisResult = {
  hypotheses: AnalyzedHypothesis[]
  playbook: FlowFixOutput[]
  visibility: VisibilityFixOutput[]
  competitor: CompetitorMeasurement | null
}

export type AnalyzeOptions = {
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
  sameness: PageSameness
  pagespeed: PageSpeed | null
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
 * The second page, measured by the same code as the first and by PageSpeed Insights.
 *
 * It lives here rather than in lib/competitor.ts because it touches the browser, and that module is
 * imported by a client component.
 */
export async function measureCompetitor(url: string, locale: Locale): Promise<CompetitorMeasurement> {
  const [{ html, structure, seo, performance, mobile }, pagespeed] = await Promise.all([
    scrapePage(url),
    fetchPageSpeed(url, locale)
  ])

  return { url, structure, seo, performance, mobile, pagespeed, keywords: keywordsFor(html, seo) }
}

/**
 * The reader's own other pages, opened for their words. Nothing here reaches the readout. Sequential,
 * and each failure is silent: they share the browser slots with every other analysis running.
 */
export async function measureNeighbours(
  pageUrl: string,
  links: PageLink[]
): Promise<{ id: string; url: string; text: string }[]> {
  const measured: { id: string; url: string; text: string }[] = []

  for (const neighbour of pickNeighbours(links, pageUrl)) {
    try {
      const { sections, html } = await scrapePageText(neighbour.url)
      const composed = composePageText({
        sections,
        fallback: preprocessHtml(html),
        budget: NEIGHBOUR_TEXT_MAX_CHARS
      })
      if (composed.text.trim()) measured.push({ ...neighbour, text: composed.text })
    } catch (error) {
      console.warn('[analyze] neighbour page unreadable', { url: neighbour.url, error })
    }
  }

  return measured
}

/**
 * Everything one scrape produced: the columns a row stores, and the raw material a generation needs.
 * Separate from the generation so the measurement can be persisted the moment it exists. See
 * lib/run-analysis.ts.
 */
export type MeasuredPage = PageMeasurement & {
  html: string
  elements: PageElement[]
  sections?: PageSection[]
  // Detected here because this is the first moment `lang` is known. See docs/invariants.md.
  market: Market
  links?: PageLink[]
}

export async function measurePage(url: string, locale: Locale): Promise<MeasuredPage> {
  if (process.env.E2E_FIXTURES === '1') {
    return {
      structure: FIXTURE_STRUCTURE,
      seo: FIXTURE_SEO,
      performance: FIXTURE_PERFORMANCE,
      crawlerAccess: FIXTURE_CRAWLER_ACCESS,
      keywords: FIXTURE_KEYWORDS,
      mobile: FIXTURE_MOBILE,
      sameness: FIXTURE_SAMENESS,
      pagespeed: FIXTURE_PAGESPEED,
      html: '',
      elements: [],
      sections: [],
      market: detectMarket({ url, lang: FIXTURE_SEO.lang })
    }
  }

  // PageSpeed Insights runs on Google's side and takes no browser slot, so it runs beside the scrape
  // rather than after it.
  const [
    { html, elements, structure, seo, performance, mobile, sections, links, sameness },
    crawlerAccess,
    pagespeed
  ] = await Promise.all([scrapePage(url), fetchCrawlerAccess(url), fetchPageSpeed(url, locale)])

  return {
    structure,
    seo,
    performance,
    crawlerAccess,
    mobile,
    sameness,
    pagespeed,
    keywords: keywordsFor(html, seo),
    html,
    elements,
    sections,
    links,
    market: detectMarket({ url, lang: seo.lang })
  }
}

// The audits PageSpeed Insights failed in the given categories, as a generator sees them.
function auditsFor(pagespeed: PageSpeed | null, categories: PageSpeedCategory[]) {
  return (pagespeed?.audits ?? [])
    .filter((audit) => categories.includes(audit.category))
    .map(({ id, category, title, displayValue }) => ({ id, category, title, displayValue }))
}

function pageSpeedSection(pagespeed: PageSpeed | null, categories: PageSpeedCategory[]): string {
  if (!pagespeed) return ''

  return `PageSpeed Insights, measured by Google on a mobile run. Category scores out of 100, and the audits this page failed in them. Each audit has an id you may use as a finding (JSON):\n${JSON.stringify(
    {
      scores: Object.fromEntries(categories.map((category) => [category, pagespeed.categories[category]])),
      audits: auditsFor(pagespeed, categories)
    },
    null,
    2
  )}`
}

// A fix may only point at an id the prompt was actually given. Anything else becomes null here rather
// than a link to nothing on the report.
function keepKnownFindings<T extends FixOutput>(fixes: T[], allowed: Set<string>): T[] {
  return fixes.map((fix) => (fix.finding && allowed.has(fix.finding) ? fix : { ...fix, finding: null }))
}

/**
 * The generated half, run against a page that has already been measured and written down.
 */
export async function generateFromMeasurement(
  url: string,
  measured: MeasuredPage,
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  const locale = options.locale ?? DEFAULT_LOCALE

  if (process.env.E2E_FIXTURES === '1') {
    // The failure path, on demand. Nested inside the fixture branch so no production deploy can
    // reach it however this variable is set. `throw` is a generation that crashed; `empty` is one
    // that answered with nothing; `copy` is a report with the other two lists and no copy list.
    if (process.env.E2E_FAIL_GENERATION === 'throw') {
      throw new Error('E2E: generation failed on purpose')
    }

    const analysis = fixtureAnalysis(locale)
    // Every fixture element is built from a hypothesis's own `current_copy`, so the fixtures always
    // resolve. This withholds the first one, which is the only way the drop in `resolveTargets` is
    // reachable without a real model. Keyed on the URL because every spec separates its scenario by
    // URL.
    const unquoted = url.includes('hunch-e2e-unquoted')
    const fixtureElements: PageElement[] = analysis.hypotheses
      .slice(unquoted ? 1 : 0)
      .map((h, i) => ({
        text: h.current_copy,
        selector: `[data-hunch-fixture="${i}"]`,
        tag: 'p',
        capacity: h.current_copy.length,
        emphasized: false
      }))

    const mode = process.env.E2E_FAIL_GENERATION
    const barren = mode === 'empty'
    const noCopy = barren || mode === 'copy'

    return resolveTargets({
      output: noCopy ? { hypotheses: [] } : analysis,
      elements: fixtureElements,
      playbook: barren ? [] : fixturePlaybook(locale),
      visibility: barren ? [] : fixtureVisibility(locale),
      competitor: null
    })
  }

  const startedAt = Date.now()

  const {
    html,
    elements,
    structure,
    seo,
    performance,
    mobile,
    sameness,
    sections,
    crawlerAccess,
    keywords,
    market,
    pagespeed
  } = measured

  const competitor = options.competitorUrl
    ? await measureCompetitor(options.competitorUrl, locale)
    : null

  const neighbours = await measureNeighbours(url, measured.links ?? [])

  const pageText = composePageText({ sections, fallback: preprocessHtml(html) })
  const measuredAt = Date.now()

  const competitorHost = competitor ? displayHost(competitor.url) : null
  const competitorSection = competitor
    ? `\n\nReadout of ${competitorHost}, a second page the reader pointed at (JSON):\n${JSON.stringify(
        {
          structure: competitor.structure,
          seo: competitor.seo,
          performance: competitor.performance,
          pagespeed: competitor.pagespeed?.categories ?? null
        },
        null,
        2
      )}`
    : ''

  const neighbourSection =
    neighbours.length > 0
      ? `\n\nOther pages of this same site, read by this code just now. They carry the facts the landing page left out:\n${neighbours
          .map((page) => `\n[${page.id}] ${page.url}\n${page.text}`)
          .join('\n')}`
      : ''

  // Counted over the WHOLE page, including any part the text budget could not carry, so a model
  // reading a cut page still knows the page has pricing and an FAQ. See docs/invariants.md.
  const structureSection = `\n\nCounted over the whole page, including any part left out of the text
above (JSON):\n${JSON.stringify(
    {
      hasPricing: structure.hasPricing,
      hasFaq: structure.hasFaq,
      hasTestimonials: structure.hasTestimonials,
      headingCount: structure.headingCount,
      sectionCount: structure.sectionCount,
      wordCount: structure.wordCount
    },
    null,
    2
  )}`

  const elementList = promptElements(elements)
    .map((e) => `<${e.tag}> "${e.text}"`)
    .join('\n')
  const elementsSection = elementList
    ? `\n\nPage elements (each line is one real on-page element; current_copy must quote exactly one of these verbatim):\n\n${elementList}`
    : ''

  const findings = measuredFindings({
    structure,
    seo,
    performance,
    sameness: null,
    crawler: crawlerAccess,
    keywords,
    mobile,
    market
  })
  const findingsFor = (groups: ReadoutGroup[]) =>
    findings.filter((finding) => groups.includes(finding.group))

  const playbookFindings = findingsFor(['structure', 'credibility', 'mobile', 'load'])
  const playbookCategories = PAGESPEED_CATEGORY_BY_FIX_KIND.flow
  const visibilityFindings = findingsFor(['declared', 'crawler_access'])
  const visibilityCategories = PAGESPEED_CATEGORY_BY_FIX_KIND.visibility

  const [object, playbook, visibility] = await Promise.all([
    generateHypotheses({
      locale,
      market,
      competitorHost,
      prompt: `Landing page copy:\n\n${pageText.text}${coverageNote(pageText)}${structureSection}${elementsSection}${neighbourSection}${competitorSection}`
    }),
    generatePlaybook({
      structure,
      mobile,
      performance,
      findings: playbookFindings,
      sameness,
      pagespeed,
      locale,
      market,
      competitor
    }),
    generateVisibility({
      seo,
      structure,
      findings: visibilityFindings,
      crawlerAccess,
      keywords,
      pageText,
      pagespeed,
      locale,
      market
    })
  ])

  const allowedIds = (list: MeasuredFinding[], categories: PageSpeedCategory[]) =>
    new Set([...list.map((finding) => finding.id), ...auditsFor(pagespeed, categories).map((audit) => audit.id)])

  const result = resolveTargets({
    output: object,
    elements,
    playbook: keepKnownFindings(playbook, allowedIds(playbookFindings, playbookCategories)),
    visibility: keepKnownFindings(visibility, allowedIds(visibilityFindings, visibilityCategories)),
    competitor
  })

  console.info('[analyze] timings (ms)', {
    measure: measuredAt - startedAt,
    generation: Date.now() - measuredAt,
    total: Date.now() - startedAt,
    market,
    robots: crawlerAccess.status,
    pagespeed: pagespeed !== null,
    competitor: competitorHost,
    neighbours: neighbours.map((page) => page.id),
    copyErrors: result.hypotheses.length,
    copyDropped: object.hypotheses.length - result.hypotheses.length,
    playbookErrors: playbook.length,
    visibilityErrors: visibility.length
  })

  return result
}

/**
 * The measured findings, as a generator sees them: ids, severities and values only. The label is the
 * dictionary's job and the model has no use for it.
 */
function findingsSection(findings: MeasuredFinding[]): string {
  const compact = findings.map((finding) => ({
    id: finding.id,
    severity: finding.severity,
    value: finding.value
  }))

  return `Findings counted on this page (JSON). The "finding" field of every error you write must be one of these ids, a PageSpeed audit id you were given, or null:\n${JSON.stringify(compact, null, 2)}`
}

/**
 * The copy errors. Degrades into an empty list like the other two, so one failing call never takes the
 * other two lists down with it. Whether anything came back at all is decided in lib/run-analysis.ts.
 */
async function generateHypotheses(input: {
  locale: Locale
  market: Market
  competitorHost: string | null
  prompt: string
}): Promise<AnalysisOutput> {
  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: AnalysisOutputSchema,
      maxTokens: 8000,
      system: systemPrompt(
        AI_OUTPUT_LANGUAGE[input.locale],
        MARKET_NAME[input.market],
        input.competitorHost
      ),
      prompt: input.prompt
    })
    return object
  } catch (error) {
    console.error('[analyze] hypothesis generation failed', error)
    return { hypotheses: [] }
  }
}

export type PlaybookInput = {
  structure: PageStructure
  mobile: PageMobile
  performance: PagePerformance
  // Context and never findings: every mark is `ok`, and a fix may not attach to a passing check.
  sameness: PageSameness | null
  findings: MeasuredFinding[]
  pagespeed: PageSpeed | null
  locale: Locale
  market: Market
  competitor?: CompetitorMeasurement | null
}

export async function generatePlaybook(input: PlaybookInput): Promise<FlowFixOutput[]> {
  if (process.env.E2E_FIXTURES === '1') {
    return fixturePlaybook(input.locale)
  }

  const sections = [
    `Structural readout of the page (JSON):\n${JSON.stringify(input.structure, null, 2)}`,
    `The same page in a phone viewport (JSON):\n${JSON.stringify(input.mobile, null, 2)}`,
    `What the page cost to load, measured from a datacentre (JSON):\n${JSON.stringify(input.performance, null, 2)}`,
    findingsSection(input.findings),
    pageSpeedSection(input.pagespeed, PAGESPEED_CATEGORY_BY_FIX_KIND.flow)
  ].filter(Boolean)

  if (input.sameness) {
    sections.push(
      `Marks this page shares with pages built out of the same defaults, counted on it (JSON):\n${JSON.stringify(input.sameness, null, 2)}`
    )
  }

  const competitorHost = input.competitor ? displayHost(input.competitor.url) : null
  if (input.competitor) {
    sections.push(
      `Structural readout of ${competitorHost}, a second page the reader pointed at (JSON):\n${JSON.stringify(
        { structure: input.competitor.structure, pagespeed: input.competitor.pagespeed?.categories ?? null },
        null,
        2
      )}`
    )
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
  findings: MeasuredFinding[]
  crawlerAccess: CrawlerAccess
  keywords: PageKeywords
  // The page's own readable text. Without it the call judges a body it was never given. See
  // docs/ai-pipeline.md.
  pageText: ComposedPageText
  pagespeed: PageSpeed | null
  locale: Locale
  market: Market
}

export async function generateVisibility(input: VisibilityInput): Promise<VisibilityFixOutput[]> {
  if (process.env.E2E_FIXTURES === '1') {
    return fixtureVisibility(input.locale)
  }

  const sections = [
    `Metadata readout of the page (JSON):\n${JSON.stringify(input.seo, null, 2)}`,
    `The page's own readable text. This is what a crawler and a language model receive from it, so
judge what the page does and does not SAY against this and never against anything else:\n${
      input.pageText.text
    }${coverageNote(input.pageText)}`,
    `Readable content on the page (JSON):\n${JSON.stringify(
      {
        hasFaq: input.structure.hasFaq,
        hasPricing: input.structure.hasPricing,
        wordCount: input.structure.wordCount,
        headingCount: input.structure.headingCount,
        sectionCount: input.structure.sectionCount
      },
      null,
      2
    )}`,
    `robots.txt (JSON). A status of "unknown" means the file could not be read: it does NOT mean the
file is missing and does NOT mean anything is blocked, so say nothing about robots.txt in that
case:\n${JSON.stringify(input.crawlerAccess, null, 2)}`,
    findingsSection(input.findings),
    pageSpeedSection(input.pagespeed, PAGESPEED_CATEGORY_BY_FIX_KIND.visibility),
    `Terms the page itself repeats, counted on the page, with where each one already appears:\n${JSON.stringify(
      input.keywords.terms,
      null,
      2
    )}`
  ].filter(Boolean)

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

function resolveTargets(input: {
  output: AnalysisOutput
  elements: PageElement[]
  playbook: FlowFixOutput[]
  visibility: VisibilityFixOutput[]
  competitor: CompetitorMeasurement | null
}): AnalysisResult {
  const { output, elements, playbook, visibility, competitor } = input

  return {
    playbook,
    visibility,
    competitor,
    hypotheses: output.hypotheses.flatMap((h) => {
      const resolved = resolveTarget(h.current_copy, elements)

      // A quote that is on no element is a line the model wrote, and the card renders it as what the
      // page says today. The prompt requires it verbatim and cannot enforce that, so the check
      // happens here, in code.
      if (!resolved.found) {
        console.warn('[analyze] hypothesis dropped, current_copy is on no element', {
          section: h.section,
          currentCopy: h.current_copy
        })
        return []
      }

      return [
        {
          ...h,
          current_copy: resolved.text ?? h.current_copy,
          selector: resolved.selector,
          target: resolved.mode
        }
      ]
    })
  }
}
