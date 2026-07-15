import Anthropic from '@anthropic-ai/sdk'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import {
  AnalysisOutputSchema,
  type AnalysisOutput,
  type HypothesisOutput
} from '@/lib/ai/schema'
import { COMPETITOR_RESEARCH_PROMPT, SYSTEM_PROMPT } from '@/lib/ai/prompt'
import { FIXTURE_ANALYSIS } from '@/lib/ai/fixtures'
import { type PageElement, preprocessHtml, resolveTarget, scrapePage } from '@/lib/scrape'
import type { HypothesisTarget } from '@/lib/enums'

const MODEL = 'claude-sonnet-4-6'

// Cap the element list passed to generation so it grounds targeting without blowing the token budget.
const MAX_PROMPT_ELEMENTS = 150

export type AnalyzedHypothesis = HypothesisOutput & {
  selector: string | null
  target: HypothesisTarget
}

export type AnalysisResult = {
  competitors: AnalysisOutput['competitors']
  hypotheses: AnalyzedHypothesis[]
}

export type AnalyzeOptions = {
  brief?: string
  competitorUrls?: string[]
}

export async function analyzeLandingPage(
  url: string,
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  if (process.env.E2E_FIXTURES === '1') {
    // Synthesize one element per fixture hypothesis so its current_copy resolves to `auto` (the
    // fixtures represent an idealized clean page), keeping the deterministic launch-a-test flow live.
    const fixtureElements: PageElement[] = FIXTURE_ANALYSIS.hypotheses.map((h, i) => ({
      text: h.current_copy,
      selector: `[data-hunch-fixture="${i}"]`,
      tag: 'p'
    }))
    return resolveTargets(FIXTURE_ANALYSIS, fixtureElements)
  }

  const { html, elements } = await scrapePage(url)
  const content = preprocessHtml(html)

  // Paid "Competitor mode": ground on the pages the user supplied instead of auto web-search.
  const provided = options.competitorUrls?.length
    ? await researchProvidedCompetitors(options.competitorUrls)
    : null
  const research = provided ?? (await researchCompetitors(content))

  const briefSection = options.brief
    ? `\n\nBusiness details from the founder (use these real facts to write finished copy):\n\n${options.brief}`
    : ''

  const elementList = elements
    .slice(0, MAX_PROMPT_ELEMENTS)
    .map((e) => `(${e.tag}) "${e.text}"`)
    .join('\n')
  const elementsSection = elementList
    ? `\n\nPage elements (each line is one real on-page element; current_copy must quote exactly one of these verbatim, and the variant must match its length and role):\n\n${elementList}`
    : ''

  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: AnalysisOutputSchema,
    maxTokens: 16000,
    system: SYSTEM_PROMPT,
    prompt: `Landing page copy:\n\n${content}${elementsSection}\n\nCompetitive research brief:\n\n${research || 'No competitor research available.'}${briefSection}`
  })

  const competitors = options.competitorUrls?.length
    ? options.competitorUrls.map((competitorUrl) => ({
        name: hostnameOf(competitorUrl),
        url: competitorUrl
      }))
    : object.competitors

  return resolveTargets({ ...object, competitors }, elements)
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
  const parts: string[] = []
  for (const url of urls) {
    try {
      const { html } = await scrapePage(url)
      parts.push(`Competitor: ${hostnameOf(url)} (${url})\n${preprocessHtml(html).slice(0, 2500)}`)
    } catch {
      continue
    }
  }
  return parts.length ? parts.join('\n\n---\n\n') : null
}

function resolveTargets(output: AnalysisOutput, elements: PageElement[]): AnalysisResult {
  return {
    competitors: output.competitors,
    hypotheses: output.hypotheses.map((h) => {
      const resolved = resolveTarget(h.current_copy, elements)
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
      model: MODEL,
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
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
