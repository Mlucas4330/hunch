import { HTTP_STATUS } from '@/lib/constants'
import { assertPublicUrl } from '@/lib/url-guard'

export type GuardedFetchOptions = {
  timeoutMs: number
  maxBytes: number
  maxRedirects: number
  headers: Record<string, string>
}

export type GuardedResponse = {
  // Where the last hop landed, which is the requested URL when nothing redirected.
  url: string
  status: number
  headers: Headers
  redirected: boolean
  // Null on a status outside 2xx, and on a body past `maxBytes`.
  body: string | null
}

/**
 * A plain fetch to a URL somebody else controls.
 *
 * **Every hop is validated, not only the first.** Redirects are followed by hand and each `Location`
 * passes `assertPublicUrl` before it is requested, because `redirect: 'follow'` would let a `302` walk
 * the request to a private address. See docs/security.md.
 *
 * Null on anything that is not an answer: a refused URL, a network error, a timeout, a redirect with
 * no `Location`, or more hops than `maxRedirects`.
 */
export async function guardedFetch(
  raw: string,
  options: GuardedFetchOptions
): Promise<GuardedResponse | null> {
  let target = raw

  for (let hop = 0; hop <= options.maxRedirects; hop++) {
    let response: Response
    try {
      const safe = await assertPublicUrl(target)
      response = await fetch(safe.href, {
        redirect: 'manual',
        signal: AbortSignal.timeout(options.timeoutMs),
        headers: options.headers
      })
    } catch {
      return null
    }

    if (response.status >= HTTP_STATUS.redirectMin && response.status < HTTP_STATUS.clientErrorMin) {
      await response.body?.cancel()
      const location = response.headers.get('location')
      if (!location) return null
      try {
        target = new URL(location, target).href
      } catch {
        return null
      }
      continue
    }

    const body = response.ok ? await readCapped(response, options.maxBytes) : null
    if (!response.ok) await response.body?.cancel()

    return { url: target, status: response.status, headers: response.headers, redirected: hop > 0, body }
  }

  return null
}

async function readCapped(response: Response, maxBytes: number): Promise<string | null> {
  try {
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > maxBytes) return null
    return new TextDecoder().decode(buffer)
  } catch {
    return null
  }
}
