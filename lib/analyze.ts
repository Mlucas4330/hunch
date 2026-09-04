import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import {
  AdIdeasSchema,
  AlternateVariantsSchema,
  AnalysisOutputSchema,
  CritiqueSchema,
  PlaybookOutputSchema,
  VisibilityOutputSchema,
  type AdIdeas,
  type AnalysisOutput,
  type FlowFixOutput,
  type HypothesisOutput,
  type VariantOutput,
  type VisibilityFixOutput
} from '@/lib/ai/schema'
import { applyCritique, critiqueInput } from '@/lib/ai/critique'
import {
  adIdeasPrompt,
  alternateVariantsPrompt,
  critiquePrompt,
  playbookPrompt,
  systemPrompt,
  visibilityPrompt
} from '@/lib/ai/prompt'
import {
  AI_OUTPUT_LANGUAGE,
  DEFAULT_LOCALE,
  MARKET_NAME,
  NEIGHBOUR_TEXT_MAX_CHARS,
  VARIANT_TONE_INSTRUCTION
} from '@/lib/constants'
import {
  FIXTURE_CRAWLER_ACCESS,
  FIXTURE_KEYWORDS,
  FIXTURE_MOBILE,
  FIXTURE_PERFORMANCE,
  FIXTURE_SEO,
  FIXTURE_STRUCTURE,
  fixtureAdIdeas,
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
import { composePageText, coverageNote, type ComposedPageText } from '@/lib/page-text'
import { promptElements, resolveTarget } from '@/lib/prompt-elements'
import { pickNeighbours } from '@/lib/site-pages'
import { rewriteStats } from '@/lib/rewrite-stats'
import {
  type PageElement,
  type PageLink,
  type PageMobile,
  type PagePerformance,
  type PageSection,
  type PageSeo,
  type PageStructure,
  preprocessHtml,
  scrapePage,
  scrapePageText
} from '@/lib/scrape'
import { variantCharBudget, variantWordBudget, wordCount } from '@/lib/text'
import { measuredFindings, type MeasuredFinding } from '@/lib/readout'
import type { HypothesisTarget, Locale, Market, ReadoutGroup, VariantTone } from '@/lib/enums'

const MODEL = 'claude-sonnet-4-6'

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

/**
 * The reader's own other pages, opened for their words.
 *
 * **The landing page is not where a business says what it does.** The price is on the pricing page,
 * the mechanism is in the docs, and the copy generator had seen none of it -- so it rewrote a line
 * using the only vocabulary in front of it, which was the vocabulary of the line it was replacing.
 * This is the same move the brief made, with code doing the finding instead of the reader doing the
 * typing. See docs/ai-pipeline.md.
 *
 * **Nothing here reaches the readout or the score.** These pages are material for a prompt, exactly
 * as a competitor's readout is, and a number off one of them would be presented as a fact about the
 * page the reader pasted. `measuredFindings` never sees them.
 *
 * **Sequential, and each failure is silent.** They share `SCRAPE_MAX_CONCURRENT_PAGES` with every
 * other analysis running, and a pricing page that 404s or times out must not take down a generation
 * the reader already paid for -- it is extra material, so its absence is the state the product was
 * in yesterday.
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
 *
 * The two are separate so the measurement can be persisted the moment it exists, roughly twenty
 * seconds in. Measuring and generating in one call and handing back a finished analysis is what
 * makes an owned run write nothing for three minutes. See lib/run-analysis.ts.
 */
export type MeasuredPage = PageMeasurement & {
  html: string
  elements: PageElement[]
  sections?: PageSection[]
  /**
   * Detected here rather than at row creation because this is the first moment `lang` is known, and
   * `lang` is the stronger of the two signals. See docs/invariants.md.
   */
  market: Market
  // The page's own same-origin links, so `measureNeighbours` can choose from them without a second
  // scrape of the page that produced them.
  links?: PageLink[]
}

export async function measurePage(url: string): Promise<MeasuredPage> {
  if (process.env.E2E_FIXTURES === '1') {
    return {
      structure: FIXTURE_STRUCTURE,
      seo: FIXTURE_SEO,
      performance: FIXTURE_PERFORMANCE,
      crawlerAccess: FIXTURE_CRAWLER_ACCESS,
      keywords: FIXTURE_KEYWORDS,
      mobile: FIXTURE_MOBILE,
      html: '',
      elements: [],
      sections: [],
      market: detectMarket({ url, lang: FIXTURE_SEO.lang })
    }
  }

  const [{ html, elements, structure, seo, performance, mobile, sections, links }, crawlerAccess] =
    await Promise.all([scrapePage(url), fetchCrawlerAccess(url)])

  return {
    structure,
    seo,
    performance,
    crawlerAccess,
    mobile,
    keywords: keywordsFor(html, seo),
    html,
    elements,
    sections,
    links,
    market: detectMarket({ url, lang: seo.lang })
  }
}

/**
 * The paid half, run against a page that has already been measured and already been written down.
 *
 * **The competitor scrape lives here rather than beside the page scrape**, which is a change from
 * when this was one function. It is only ever read by a prompt, so measuring it before the readout
 * is stored would hold the reader's score behind a second browser slot for a page that is not even
 * theirs.
 */
export async function generateFromMeasurement(
  url: string,
  measured: MeasuredPage,
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  const locale = options.locale ?? DEFAULT_LOCALE

  if (process.env.E2E_FIXTURES === '1') {
    // **The failure path, on demand.** Everything downstream of a generation that throws -- the
    // refund, the rethrow, the job going `unavailable`, the report showing that instead of the unlock
    // wall -- had no way to be exercised, so it was the one path in this product that had never run.
    // Nested inside the fixture branch on purpose: it cannot fire unless E2E_FIXTURES is already on,
    // so no production deploy can reach it however this variable is set.
    // `throw` is a generation that crashed; `empty` is one that answered with nothing. They reach the
    // refund by different routes -- the `catch` and the "nothing was generated" check -- and both are
    // supposed to end on the same screen, so both need to be walkable.
    if (process.env.E2E_FAIL_GENERATION === 'throw') {
      throw new Error('E2E: generation failed on purpose')
    }

    const analysis = fixtureAnalysis(locale)
    const fixtureMarket = detectMarket({ url, lang: FIXTURE_SEO.lang })
    // Every fixture element is built from a hypothesis's own `current_copy`, so the fixtures always
    // walk the happy path of `resolveTarget`. This withholds the first one: the model quoted a line
    // that is on no element, and `resolveTargets` drops that card. It is the only way that path is
    // reachable without a real model, and it is the path that deletes something the reader paid for,
    // so it does not get to be the untested one.
    //
    // **Keyed on the URL rather than on an env var**, because the e2e web server is started once with
    // a fixed environment and every spec already separates its own scenario by URL. Still inside the
    // fixture branch, so nothing deployed can reach it whatever anybody types.
    const unquoted = url.includes('hunch-e2e-unquoted')
    const fixtureElements: PageElement[] = analysis.hypotheses
      .slice(unquoted ? 1 : 0)
      .map((h, i) => ({
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
    // The second URL-keyed case, alongside the one above and for the same reason: the fixtures write
    // a genuine rewrite for every line, so the permutation drop is unreachable without a real model.
    // Reversing the first hypothesis's own words is a permutation by construction, whatever the
    // fixture happens to say.
    const permuted = url.includes('hunch-e2e-permutation')
    const copyOutput = permuted
      ? {
          hypotheses: analysis.hypotheses.map((h, i) =>
            i === 0
              ? {
                  ...h,
                  variants: h.variants.map((v) => ({
                    ...v,
                    copy: h.current_copy.split(/\s+/).reverse().join(' '),
                    emphasis: null
                  }))
                }
              : h
          )
        }
      : analysis

    // The third URL-keyed case, and the same argument as the two above: the fixtures never produce a
    // rewrite the critic would refuse, so the drop is unreachable without a real model. This runs the
    // real `applyCritique` against a fixed verdict, so what is faked is the critic's answer and never
    // the code that acts on it.
    const critiqued = url.includes('hunch-e2e-critique')
      ? {
          hypotheses: applyCritique(copyOutput.hypotheses, {
            drop: [{ index: 1, reason: 'E2E: the current line was already doing its job' }]
          }).kept
        }
      : copyOutput

    // `empty` is nothing from any of the three, the only condition that still refunds a credit.
    // `copy` is the case this whole arrangement exists for: the copy call came back with nothing and
    // the other two are full, so the reader gets a report without the copy tab and pays for it.
    const mode = process.env.E2E_FAIL_GENERATION
    const barren = mode === 'empty'
    const noCopy = barren || mode === 'copy'

    return resolveTargets({
      output: noCopy ? { hypotheses: [] } : critiqued,
      elements: fixtureElements,
      playbook: barren ? [] : fixturePlaybook(locale),
      visibility: barren ? [] : fixtureVisibility(locale),
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

  const { html, elements, structure, seo, performance, mobile, sections, crawlerAccess, keywords, market } =
    measured

  // The reader's own page is already measured and already stored. This is the only page still to
  // fetch, and it waits on its own browser slot, which is why it is not taken together with theirs.
  // See docs/invariants.md.
  const competitor = options.competitorUrl ? await measureCompetitor(options.competitorUrl) : null

  // **Only here, never in measurePage.** An ownerless run measures the page and calls no model, and
  // opening two more pages for material a generation would have used is the token-free half spending
  // browser slots on nothing. This function is the owned branch. See docs/invariants.md.
  const neighbours = await measureNeighbours(url, measured.links ?? [])

  // The page's text, cut to a budget that is stated rather than hidden at the end of the flattener,
  // and carrying the account of whatever had to go. See lib/page-text.ts.
  const pageText = composePageText({ sections, fallback: preprocessHtml(html) })
  const measuredAt = Date.now()

  const competitorHost = competitor ? displayHost(competitor.url) : null
  const competitorSection = competitor
    ? `\n\nReadout of ${competitorHost}, a second page the reader pointed at, counted by this same code (JSON). Every number in it is a measurement of that one page and of nothing else:\n${JSON.stringify(
        { structure: competitor.structure, seo: competitor.seo, performance: competitor.performance },
        null,
        2
      )}`
    : ''

  // **Only the copy call gets these.** The playbook argues from what was counted and the visibility
  // audit from the SEO readout; neither writes a sentence a founder publishes, which is the one thing
  // these pages are here to make specific. See docs/ai-pipeline.md.
  const neighbourSection =
    neighbours.length > 0
      ? `\n\nOther pages of this same site, read by this code just now. They are the reader's own words about their own business, and they carry the facts their landing page left out. Use them, and never contradict them:\n${neighbours
          .map((page) => `\n[${page.id}] ${page.url}\n${page.text}`)
          .join('\n')}`
      : ''

  const briefSection = options.brief
    ? `\n\nBusiness details from the founder (use these real facts to write finished copy):\n\n${options.brief}`
    : ''

  // Counted over the WHOLE page, including any part the text budget could not carry. It is here so
  // that a model reading a cut page still knows the page has pricing and an FAQ, instead of
  // concluding from silence that it has neither -- the failure docs/invariants.md forbids.
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
    .map(
      (e) =>
        `<${e.tag}> "${e.text}" (max ${variantWordBudget(wordCount(e.text))} words, max ${e.capacity} characters${e.emphasized ? ', styled fragment' : ''})`
    )
    .join('\n')
  const elementsSection = elementList
    ? `\n\nPage elements (each line is one real on-page element; current_copy must quote exactly one of these verbatim, and every variant you write for it must fit inside that element's word ceiling AND its character ceiling. The character ceiling is the measured width of the box that element occupies on the page: copy past it is cut off by the site's own CSS, not merely long):\n\n${elementList}`
    : ''

  // The same findings the reader is about to see above the fix lists, computed once and split by
  // what each generator can actually act on. Handing a generator ids it has no power over is how a
  // fix ends up linked to the wrong number.
  const findings = measuredFindings({
    structure,
    seo,
    performance,
    crawler: crawlerAccess,
    keywords,
    mobile,
    market
  })
  const findingsFor = (groups: ReadoutGroup[]) =>
    findings.filter((finding) => groups.includes(finding.group))

  const [object, playbook, visibility] = await Promise.all([
    generateHypotheses({
      locale,
      market,
      competitorHost,
      prompt: `Landing page copy:\n\n${pageText.text}${coverageNote(pageText)}${structureSection}${elementsSection}${briefSection}${neighbourSection}${competitorSection}`
    }),
    generatePlaybook({
      structure,
      mobile,
      performance,
      findings: findingsFor(['structure', 'credibility', 'mobile', 'load']),
      founderBrief: options.brief ?? null,
      locale,
      market,
      competitor
    }),
    generateVisibility({
      seo,
      structure,
      findings: findingsFor(['declared', 'crawler_access']),
      crawlerAccess,
      keywords,
      pageText,
      founderBrief: options.brief ?? null,
      locale,
      market
    })
  ])

  // **The second pass, and the only thing it can do is take rewrites away.** The call that wrote
  // these also decided they were worth writing and scored its own work, which is the arrangement that
  // produced an `assessment` saying the CTA removes the cost objection in the same response that
  // deleted the word "free". Judging is a different job, so it is a different call, and the schema it
  // answers with has no field for a replacement. See lib/ai/critique.ts.
  const critiqued = await critique({ hypotheses: object.hypotheses, pageText: pageText.text, locale, market })

  const result = resolveTargets({
    output: { hypotheses: critiqued },
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

  // **After `resolveTargets`, so `copyIdeas` is what the reader will actually see.** Logging it above
  // would report what the model returned, which is a different number from what survives the check on
  // the way back -- and the gap between the two is the only signal there is that the model is quoting
  // the page rather than paraphrasing it. `playbookFixes` and `visibilityFixes` were already here;
  // copy was the one of the three nothing counted.
  //
  // **The two drops are counted apart, and merging them would cost the signal above.** `copyRefused`
  // is a judgement the second pass made about a rewrite; `copyDropped` is a rewrite that quoted a line
  // the page does not carry, or proposed the words it was replacing. One says the model wrote
  // something not worth shipping, the other says it wrote something not true of this page.
  console.info('[analyze] timings (ms)', {
    measure: measuredAt - startedAt,
    generation: Date.now() - measuredAt,
    total: Date.now() - startedAt,
    market,
    robots: crawlerAccess.status,
    competitor: competitorHost,
    neighbours: neighbours.map((page) => page.id),
    copyIdeas: result.hypotheses.length,
    copyRefused: object.hypotheses.length - critiqued.length,
    copyDropped: critiqued.length - result.hypotheses.length,
    playbookFixes: playbook.length,
    visibilityFixes: visibility.length
  })

  return result
}

/**
 * The measured findings, as a generator sees them.
 *
 * Ids, severities and values only -- no labels. The label is the dictionary's job and the model has
 * no use for it; what it needs is the vocabulary of ids to choose from, and the severity, because the
 * prompt forbids hanging a fix off a passing check and Zod cannot see severity.
 *
 * This costs input tokens and never output ones: `maxTokens` caps the completion, so the only growth
 * on that side is one short `finding` per fix.
 */
function findingsSection(findings: MeasuredFinding[]): string {
  const compact = findings.map((finding) => ({
    id: finding.id,
    severity: finding.severity,
    value: finding.value
  }))

  return `Findings already counted on this page and already shown to the reader (JSON). The "finding" field of every fix you write must be one of these ids, or null:\n${JSON.stringify(compact, null, 2)}`
}

/**
 * The copy hypotheses.
 *
 * **It degrades into an empty list like the other two.** `generatePlaybook` and `generateVisibility`
 * swallow a failure the same way, on the reasoning that a missing tab is better than a lost report.
 * Throwing from inside the shared `Promise.all` would reject all three, discarding a flow playbook
 * and a visibility audit that had finished and whose tokens were already spent.
 *
 * What a credit is worth is decided afterwards, over everything that came back, rather than by
 * whichever generator threw first: see the refund in lib/run-analysis.ts.
 */
/**
 * Runs the critique and applies it, or returns the set untouched.
 *
 * **Fail open, and it is not a detail.** Everything here has already been paid for and already cost
 * its tokens; an extra call that times out must not be able to take a finished set of rewrites down
 * with it. The same reasoning as the schema floor -- see lib/ai/schema.ts.
 */
async function critique(input: {
  hypotheses: HypothesisOutput[]
  pageText: string
  locale: Locale
  market: Market
}): Promise<HypothesisOutput[]> {
  if (input.hypotheses.length === 0) return input.hypotheses

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: CritiqueSchema,
      maxTokens: 2000,
      system: critiquePrompt(AI_OUTPUT_LANGUAGE[input.locale], MARKET_NAME[input.market]),
      prompt: `Landing page copy:\n\n${input.pageText}\n\nThe rewrites proposed for it:\n\n${critiqueInput(
        input.hypotheses
      )}`
    })

    const { kept, dropped } = applyCritique(input.hypotheses, object)
    // The reasons exist for this line and for nothing else: no reader sees them, and a person
    // comparing two versions of this prompt needs to know what it thought it was doing.
    if (dropped.length > 0) console.info('[analyze] critique dropped', dropped)
    return kept
  } catch (error) {
    console.error('[analyze] critique failed, keeping every rewrite', error)
    return input.hypotheses
  }
}

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
      maxTokens: 16000,
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
  // Here because `mobile` and `performance` are fix categories. Handed the structural readout alone,
  // this generator could not answer a mobile or a load finding: the report would count both and then
  // have nothing to say about either.
  mobile: PageMobile
  performance: PagePerformance
  /**
   * The findings this generator may answer, already narrowed to the groups it can act on. Narrowed
   * rather than handed the whole readout: an id it cannot address is an invitation to link a fix to
   * the wrong number.
   */
  findings: MeasuredFinding[]
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
    `Structural readout of the page (JSON):\n${JSON.stringify(input.structure, null, 2)}`,
    `The same page in a phone viewport (JSON):\n${JSON.stringify(input.mobile, null, 2)}`,
    `What the page cost to load (JSON). These were measured from a datacentre, so they are a floor a real visitor never beats. Never present one as what a visitor experiences:\n${JSON.stringify(input.performance, null, 2)}`,
    findingsSection(input.findings)
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
  /** See the note on PlaybookInput. */
  findings: MeasuredFinding[]
  crawlerAccess: CrawlerAccess
  keywords: PageKeywords
  /**
   * The page's own readable text, and what of it had to be left out.
   *
   * **This call had none of it, and that is what produced the invented findings.** The prompt asks
   * for `ai_answerability` -- whether the page states in plain readable text what the product is,
   * who it is for and what it costs -- against a payload of metadata, counts and robots.txt. The
   * model was asked to judge a body it had never been given, and it filled the gap: our own report
   * told us to publish a price that has been in the served HTML all along, and to add a cancellation
   * guarantee for a subscription this product does not sell. See docs/ai-pipeline.md.
   */
  pageText: ComposedPageText
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

export type AdIdeasInput = {
  keywords: PageKeywords
  seo: PageSeo
  structure: PageStructure
  founderBrief: string | null
  locale: Locale
  market: Market
}

/**
 * Ad groups written off the terms this code counted on the page.
 *
 * **It is not in the `Promise.all` above and must not be moved into it.** Every generator there runs
 * on every paid analysis, and most owners of a landing page are not buying search traffic for it --
 * so putting this beside them would add a Sonnet call to every run to serve a minority. It is asked
 * for by a button instead, written once, and read back from the column afterwards. See docs/api.md.
 *
 * Returns null rather than an empty object on failure, because empty is a real answer here (a page
 * with nothing to group) and the route has to tell the two apart to decide whether to write the
 * column at all.
 */
export async function generateAdIdeas(input: AdIdeasInput): Promise<AdIdeas | null> {
  if (process.env.E2E_FIXTURES === '1') {
    return fixtureAdIdeas(input.locale)
  }

  const sections = [
    `Terms this page repeats, COUNTED in its own copy, with where each already appears. This is not
search data: there is no volume, no cost, and no competition figure here, and you must never state
one:
${JSON.stringify(input.keywords.terms, null, 2)}`,
    `What the page declares about itself (JSON):
${JSON.stringify(
      { title: input.seo.title, metaDescription: input.seo.metaDescription },
      null,
      2
    )}`,
    `Readable content on the page (JSON):
${JSON.stringify(
      { wordCount: input.structure.wordCount, hasFaq: input.structure.hasFaq },
      null,
      2
    )}`
  ]

  if (input.founderBrief) {
    sections.push(`Business details from the founder:
${input.founderBrief}`)
  }

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: AdIdeasSchema,
      maxTokens: 3000,
      system: adIdeasPrompt(AI_OUTPUT_LANGUAGE[input.locale], MARKET_NAME[input.market]),
      prompt: sections.join('\n\n')
    })

    return groundTerms(object, input.keywords)
  } catch (error) {
    console.error('[analyze] ad ideas generation failed', error)
    return null
  }
}

/**
 * Drop any term the page does not actually use.
 *
 * **Zod cannot check this and the prompt cannot guarantee it.** A `terms` entry is a plain string,
 * so a model that pluralises one, translates one, or helpfully adds a synonym produces a term this
 * code never counted -- and the whole claim the section rests on is that these words came off the
 * page. So the list is intersected with the measured terms on the way back, and a group left with
 * nothing is dropped whole rather than shown with an empty term list.
 */
function groundTerms(ideas: AdIdeas, keywords: PageKeywords): AdIdeas {
  const measured = new Set(keywords.terms.map((term) => term.term))

  return {
    ...ideas,
    groups: ideas.groups
      .map((group) => ({ ...group, terms: group.terms.filter((term) => measured.has(term)) }))
      .filter((group) => group.terms.length > 0)
  }
}

export type AlternateVariantsInput = {
  section: string
  problem: string
  currentCopy: string
  rationale: string
  recommendedCopy: string
  /**
   * Every line the model has already written for this element, the recommendation included.
   *
   * **Without it a second round is a fresh draw from the same distribution**, and round three can
   * hand back round one. The prompt already forbade paraphrasing the recommendation; this extends
   * that to everything it has tried.
   */
  alreadyWritten: string[]
  /** A direction the reader asked for, or null. Constrains form and never states a fact. */
  tone: VariantTone | null
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
    `Lines already written for this element. Every one of them was seen and not used, so a new line that paraphrases any of them is a wasted slot:\n${input.alreadyWritten
      .map((copy) => `- ${copy}`)
      .join('\n')}`,
    `Word ceiling: the current copy is ${wordCount(input.currentCopy)} words. Every alternate must be ${variantWordBudget(wordCount(input.currentCopy))} words or fewer, and ${variantCharBudget(input.currentCopy)} characters or fewer. Copy past the character ceiling is cut off by the site's own CSS.`,
    input.emphasized
      ? 'This element has a styled fragment, so set emphasis on every alternate.'
      : 'This element has no styled fragment, so set emphasis to null on every alternate.'
  ]

  // A direction the reader asked for. It constrains the form of the rewrite and never supplies a
  // fact, which is the whole reason it is an enum rather than a text box -- see lib/enums.ts.
  if (input.tone) {
    sections.push(`Direction the reader asked for:\n${VARIANT_TONE_INSTRUCTION[input.tone]}`)
  }

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

  // No measured ceiling here: the element list is long gone by the time somebody opens this drawer,
  // and `variantCharBudget` is the stand-in the prompt is given. Only the heuristic is checkable.
  object.variants.forEach((v) => warnOverLength(input.section, input.currentCopy, v.copy, null))

  return object.variants
}

/**
 * Reports a replacement that will not fit, against both ceilings, and enforces neither.
 *
 * **The two are not the same claim and only one of them was ever checked.** `variantWordBudget` is a
 * heuristic over the original's length; `capacity` is the measured width of the element's box, and it
 * is the one that decides whether the site's own CSS cuts the line off. A fifth of real rewrites pass
 * the word ceiling, and the single best rewrite seen so far was one of them, so rejecting on either
 * would throw away the good with the long.
 *
 * It logs because the measured overflow has never been counted: `capacity` is not stored, so no
 * stored row can be scored for it after the fact and `scripts/rewrite-stats.mts` can only report the
 * heuristic. Nothing here becomes a rule until that number exists. See docs/ai-pipeline.md.
 */
function warnOverLength(
  section: string,
  currentCopy: string,
  variantCopy: string,
  capacity: number | null
): void {
  const budget = variantWordBudget(wordCount(currentCopy))
  const words = wordCount(variantCopy)
  const overBudget = words > budget
  const overBox = capacity !== null && variantCopy.length > capacity
  if (!overBudget && !overBox) return

  console.warn('[analyze] variant over its ceiling', {
    section,
    overBudget,
    overBox,
    budget,
    words,
    capacity,
    chars: variantCopy.length
  })
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
    hypotheses: output.hypotheses.flatMap((h) => {
      const resolved = resolveTarget(h.current_copy, elements)

      // **A quote that is on no element is a line the model wrote, and the card renders it struck
      // through as what the page says today.** The prompt requires it verbatim off the element list
      // and cannot enforce that, and Zod sees a plain string -- the same hole `groundTerms` closes for
      // ad terms, closed the same way and for the same reason: on the way back, in code.
      //
      // The cost is real and worth naming: a usable rewrite is thrown away over a transcription slip.
      // `resolveTarget` already matches approximately, so nothing here is dropped for punctuation, and
      // the alternative is showing somebody a sentence attributed to their own page that is not on it.
      if (!resolved.found) {
        console.warn('[analyze] hypothesis dropped, current_copy is on no element', {
          section: h.section,
          currentCopy: h.current_copy
        })
        return []
      }

      // **A replacement whose words are all already in the line it replaces proposes nothing.**
      // Measured rather than judged: two of the 32 real rewrites stored are exactly this, one
      // reordering three security badges and one swapping two sentences, both ranked and shown as
      // recommended changes. Whatever a reader thinks of the page, a permutation of its own words
      // cannot be an improvement to it.
      //
      // The threshold is zero new words and nothing looser. A quarter of real rewrites reuse 70% or
      // more of the original and most are fine -- a rewrite keeps the product's own nouns -- so a
      // ratio here would throw away work on a number nothing supports. `scripts/rewrite-stats.mts`
      // is what would earn a tighter one. See lib/rewrite-stats.ts.
      const recommended = h.variants[0]
      if (recommended && rewriteStats(resolved.text ?? h.current_copy, recommended.copy).permutation) {
        console.warn('[analyze] hypothesis dropped, the replacement is a permutation', {
          section: h.section,
          currentCopy: h.current_copy,
          copy: recommended.copy
        })
        return []
      }

      h.variants.forEach((v) =>
        warnOverLength(h.section, resolved.text ?? h.current_copy, v.copy, resolved.capacity)
      )
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
