import puppeteer from 'puppeteer'

export interface PageElement {
  text: string
  selector: string
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

// Runs in the browser context: collect visible text elements with a stable CSS path so a
// variant's copy can be located and swapped on the live page by the embed snippet.
function captureElements(): PageElement[] {
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
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === node!.tagName
      )
      const index = siblings.indexOf(node) + 1
      parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag)
      node = parent
    }
    return parts.join(' > ')
  }

  const selectors = 'h1,h2,h3,h4,p,a,button,span,li'
  const seen = new Set<string>()
  const out: PageElement[] = []
  for (const el of Array.from(document.querySelectorAll(selectors))) {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
    if (!text || text.length > 300 || seen.has(text)) continue
    seen.add(text)
    out.push({ text, selector: cssPath(el) })
  }
  return out
}

// Best-effort match of a hypothesis's current copy back to a captured element selector.
// Returns null when nothing matches so the snippet can fall back to runtime text matching.
export function findSelector(currentCopy: string, elements: PageElement[]): string | null {
  const target = currentCopy.replace(/\s+/g, ' ').trim()
  if (!target) return null

  const exact = elements.find((e) => e.text === target)
  if (exact) return exact.selector

  const partial = elements.find((e) => e.text.includes(target) || target.includes(e.text))
  return partial?.selector ?? null
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
