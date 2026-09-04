import { measuredFindings, type MeasuredFinding, type ReadoutInput } from '@/lib/readout'
import type { PageKeywords } from '@/lib/keywords'
import type { PageMobile, PagePerformance, PageSeo, PageStructure } from '@/lib/scrape'
import type { Market, ReadoutFinding } from '@/lib/enums'

// **Pure, and every import above is type-only for a reason.** `competitorValues` runs inside
// MeasuredReadout, a client component, so a value import from lib/scrape here would pull puppeteer
// into the browser bundle and the page would fail to build on `Can't resolve 'fs'`. The scrape half
// lives in lib/analyze.ts, which is server-only. Same rule as lib/snapshots.ts.

/**
 * A second page, measured by the same code as the first.
 *
 * **This is what makes competitor comparison honest, and it is the whole of the argument.** The
 * reader names the URL, `lib/readout.ts` counts the same facts off it, and a number about that page
 * is a measurement this code took rather than something a model recalled. See docs/invariants.md.
 *
 * No `crawlerAccess`. The `visibility` group is about the reader's own robots.txt, and fetching
 * somebody else's compares nothing worth comparing.
 */
export type CompetitorMeasurement = {
  url: string
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
  keywords: PageKeywords
  mobile: PageMobile
}

// The competitor's page read as a readout, so the comparison runs through exactly one implementation
// of what a finding is. `crawler` is null by design and the `visibility` group drops out with it.
export function competitorInput(
  competitor: CompetitorMeasurement,
  market: Market | null
): ReadoutInput {
  return {
    structure: competitor.structure,
    seo: competitor.seo,
    performance: competitor.performance,
    keywords: competitor.keywords,
    mobile: competitor.mobile,
    crawler: null,
    market
  }
}

/**
 * The other page's value for each finding, keyed by id.
 *
 * **Subtraction between two measurements, and nothing more.** The same rule the snapshot delta obeys:
 * this may say the two numbers differ, and nothing anywhere may say the difference causes anything.
 * Nobody controlled for anything, and nobody measured either page's conversion. See
 * [invariants.md](../docs/invariants.md).
 *
 * A finding present on one side and absent from the other is left out rather than compared against
 * zero -- the competitor has no `visibility` group at all, and a page with no form has no form
 * findings, so a missing entry means "not counted here", never "counted as none".
 */
export function competitorValues(
  competitor: ReadoutInput,
  mine: MeasuredFinding[]
): Map<ReadoutFinding, MeasuredFinding> {
  const ours = new Set(mine.map((finding) => finding.id))
  const out = new Map<ReadoutFinding, MeasuredFinding>()

  for (const finding of measuredFindings(competitor)) {
    if (ours.has(finding.id)) out.set(finding.id, finding)
  }

  return out
}
