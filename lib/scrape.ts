export interface ScrapedPage {
  url: string
  html: string
}

// Foundation stub. Wired up in the POST /api/analyses feature work:
// launch Puppeteer, render the JS page, return the full HTML.
export async function scrapePage(url: string): Promise<ScrapedPage> {
  void url
  throw new Error('scrapePage not implemented')
}

// Strip scripts/styles/meta and extract semantic text only (H1, CTA, features, ...).
export function preprocessHtml(html: string): string {
  void html
  throw new Error('preprocessHtml not implemented')
}
