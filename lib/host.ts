export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Which page of the site this is, for a card that already sits under the hostname. The root reads as
 * a slash rather than as an empty string, so a home page card is not left with a blank title.
 */
export function displayPath(url: string): string {
  try {
    const { pathname, search } = new URL(url)
    return `${pathname}${search}`
  } catch {
    return url
  }
}

/**
 * The dashboard's analyses gathered under the client they are about.
 *
 * **The client is the hostname, and there is no client table.** An agency names its clients by their
 * site anyway, and a table would mean a field to fill in before every analysis, to record something
 * the URL already says.
 *
 * Insertion order is kept, so a list that arrives newest first stays newest first, and a group takes
 * the position of its newest analysis. Grouping happens after paging, so a group holds what is on
 * this page rather than everything ever run for that client. See docs/analysis-ui.md.
 */
export function groupByClient<T extends { client: string }>(items: T[]): { client: string; items: T[] }[] {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const existing = groups.get(item.client)
    if (existing) existing.push(item)
    else groups.set(item.client, [item])
  }

  return [...groups].map(([client, grouped]) => ({ client, items: grouped }))
}
