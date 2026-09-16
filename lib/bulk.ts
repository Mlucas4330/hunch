import { BULK_URLS_MAX } from '@/lib/constants'

/**
 * The pure half of bulk generation: what a pasted list means, and when a batch is done.
 *
 * Pure by necessity and by preference. The queries live in lib/bulk-batches.ts, and everything here
 * is what the tests can pin without a database.
 */

export type ParsedUrls =
  | { ok: true; urls: string[] }
  | { ok: false; reason: 'empty' | 'too_many'; count: number }

/**
 * The URLs in a pasted textarea, one per line.
 *
 * Blank lines go, surrounding whitespace goes, and a URL repeated in the list is kept once: pasting
 * the same page twice is a slip, and charging two runs for it would be the app taking advantage of
 * one. **Over the cap the whole list is refused rather than trimmed**, because a batch silently
 * missing its last ten rows is worse than one that did not start.
 */
export function parseBulkUrls(input: string, max: number = BULK_URLS_MAX): ParsedUrls {
  const seen = new Set<string>()
  const urls: string[] = []

  for (const line of input.split('\n')) {
    const url = line.trim()
    if (!url || seen.has(url)) continue

    seen.add(url)
    urls.push(url)
  }

  if (urls.length === 0) return { ok: false, reason: 'empty', count: 0 }
  if (urls.length > max) return { ok: false, reason: 'too_many', count: urls.length }

  return { ok: true, urls }
}

export type BatchItemState = { finishedAt: Date | null; failedAt: Date | null } | null

/**
 * Whether every item in the batch has settled.
 *
 * Computed from the rows rather than kept as a count, and an item whose run row is missing counts as
 * still working: an item enqueued a moment ago has no run to read yet, and calling that "done" would
 * announce a finished batch before it started.
 */
export function batchFinished(items: BatchItemState[]): boolean {
  if (items.length === 0) return false

  return items.every((run) => run !== null && (run.finishedAt !== null || run.failedAt !== null))
}
