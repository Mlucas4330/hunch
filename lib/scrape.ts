import puppeteer from 'puppeteer'
import { TARGET_MATCH_MAX_WORD_RATIO } from '@/lib/constants'

export interface PageElement {
  text: string
  selector: string
  tag: string
}

export type TargetMode = 'auto' | 'manual'

export interface ResolvedTarget {
  selector: string | null
  mode: TargetMode
  text: string | null
}

export interface ScrapedPage {
  url: string
  html: string
  elements: PageElement[]
}

export class ScrapeError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ScrapeError'
  }
}

export async function scrapePage(url: string): Promise<ScrapedPage> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    const html = await page.content()
    const elements = await page.evaluate(captureElements)
    return { url, html, elements }
  } catch (error) {
    throw new ScrapeError(`Failed to scrape ${url}`, { cause: error })
  } finally {
    await browser.close()
  }
}

// Renders the landing page with the variant copy swapped into its target element and captures an
// above-the-fold viewport PNG -- the changed element is scrolled to center so the report shows it
// in context, surrounded by its real neighbors. When a selector is given but the element can no
// longer be found or its text has drifted from `controlCopy` (stale selector), throws ScrapeError
// rather than silently shooting an unchanged page, so callers can degrade honestly.
export async function screenshotVariant(
  url: string,
  selector: string | null,
  variantCopy: string,
  controlCopy?: string | null
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    if (selector) {
      const outcome = await page.evaluate(
        (sel, vCopy, cCopy) => {
          const el = document.querySelector(sel)
          if (!el) return 'not_found'
          if (cCopy) {
            const own = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
            const control = cCopy.replace(/\s+/g, ' ').trim().toLowerCase()
            if (own !== control && !own.includes(control) && !control.includes(own)) {
              return 'mismatch'
            }
          }
          el.textContent = vCopy
          el.scrollIntoView({ block: 'center', inline: 'nearest' })
          return 'ok'
        },
        selector,
        variantCopy,
        controlCopy ?? null
      )

      if (outcome !== 'ok') {
        throw new ScrapeError(`Variant target not applicable on ${url} (${outcome})`)
      }

      // Let the scroll settle and any lazy-loaded imagery paint before capturing.
      await new Promise((resolve) => setTimeout(resolve, 400))
    }

    const shot = await page.screenshot({ type: 'png' })
    return Buffer.from(shot)
  } catch (error) {
    if (error instanceof ScrapeError) throw error
    throw new ScrapeError(`Failed to screenshot ${url}`, { cause: error })
  } finally {
    await browser.close()
  }
}

// Runs in the browser context: collect each visible "text unit" with a stable CSS path. A text unit
// is the innermost block-level element -- one whose only element children are inline formatting
// (span, a, strong, ...) -- captured with its FULL text so inline styling spans inside a heading are
// folded back in, while real blocks (a badge vs the headline beside it) stay separate entries.
function captureElements(): PageElement[] {
  const SKIP = new Set(['script', 'style', 'noscript', 'svg', 'head', 'meta', 'link', 'title'])
  // Inline formatting tags fold into their parent's text. Any other child tag makes the parent a
  // container, so its block children are captured on their own instead of merged together.
  const INLINE = new Set([
    'span', 'a', 'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup', 'code',
    'abbr', 'time', 'cite', 'q', 'kbd', 'samp', 'var', 'ins', 'del', 'wbr', 'br', 'bdi', 'bdo',
    'font', 'svg', 'img', 'picture', 'label'
  ])

  function hasBlockChild(el: Element): boolean {
    return Array.from(el.children).some((c) => !INLINE.has(c.tagName.toLowerCase()))
  }

  function cssPath(el: Element): string {
    const parts: string[] = []
    let node: Element | null = el
    while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== 'html') {
      if (node.id) {
        parts.unshift(`#${CSS.escape(node.id)}`)
        break
      }
      const tag = node.tagName.toLowerCase()
      const parent: Element | null = node.parentElement
      if (!parent) {
        parts.unshift(tag)
        break
      }
      const siblings = Array.from(parent.children).filter((c) => c.tagName === node!.tagName)
      const index = siblings.indexOf(node) + 1
      parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag)
      node = parent
    }
    return parts.join(' > ')
  }

  function isVisible(el: Element): boolean {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    const style = getComputedStyle(el)
    return style.visibility !== 'hidden' && style.display !== 'none'
  }

  const seen = new Set<string>()
  const out: PageElement[] = []
  for (const el of Array.from(document.querySelectorAll('*'))) {
    const tag = el.tagName.toLowerCase()
    if (SKIP.has(tag)) continue
    // A text unit has no block child; capture it as the outermost inline-only element (skipping the
    // inner span fragments folded into it). Links and buttons are ALSO captured individually so a CTA
    // still resolves on its own even when a flex row folds several anchors into one merged entry.
    if (hasBlockChild(el)) continue
    const parent = el.parentElement
    const outermost = !parent || parent.tagName === 'BODY' || hasBlockChild(parent)
    const isLink = tag === 'a' || tag === 'button'
    if (!outermost && !isLink) continue
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
    if (!text || text.length > 300 || seen.has(text)) continue
    if (!/[a-z0-9]/i.test(text)) continue
    if (!isVisible(el)) continue
    seen.add(text)
    out.push({ text, selector: cssPath(el), tag })
  }
  return out
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length
}

// Resolves a hypothesis's current copy to a single captured element, and classifies how safely it
// can be applied. `auto` only when the copy maps to exactly one element of a compatible size (so a
// long merged string never snaps onto a tiny badge); otherwise `manual`, with a null selector, and
// the report/embed degrade honestly instead of swapping the wrong element.
export function resolveTarget(currentCopy: string, elements: PageElement[]): ResolvedTarget {
  const manual: ResolvedTarget = { selector: null, mode: 'manual', text: null }
  const target = normalize(currentCopy)
  if (!target) return manual

  const exact = elements.filter((e) => normalize(e.text) === target)
  if (exact.length === 1) return { selector: exact[0].selector, mode: 'auto', text: exact[0].text }
  if (exact.length > 1) return manual

  const targetWords = wordCount(target)
  const near = elements
    .map((e) => ({ el: e, norm: normalize(e.text) }))
    .filter(({ norm }) => norm.includes(target) || target.includes(norm))
    .map(({ el, norm }) => {
      const words = wordCount(norm)
      const ratio = Math.max(words, targetWords) / Math.max(1, Math.min(words, targetWords))
      return { el, ratio }
    })
    .filter(({ ratio }) => ratio <= TARGET_MATCH_MAX_WORD_RATIO)
    .sort((a, b) => a.ratio - b.ratio)

  if (near.length === 0) return manual
  // Ambiguous when the two best candidates are equally close.
  if (near.length > 1 && near[0].ratio === near[1].ratio) return manual
  return { selector: near[0].el.selector, mode: 'auto', text: near[0].el.text }
}

export function preprocessHtml(html: string): string {
  const text = html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()

  return text.slice(0, 8000)
}
