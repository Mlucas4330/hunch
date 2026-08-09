import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import {
  ALLOWED_SCRAPE_PORTS,
  ALLOWED_SCRAPE_PROTOCOLS,
  BLOCKED_HOST_SUFFIXES,
  HOST_RESOLUTION_CACHE_TTL_MS
} from '@/lib/constants'

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && (b === 168 || b === 0)) return true
  if (a === 169 && b === 254) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  return a >= 224
}

function isPrivateV6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0]
  if (addr === '::' || addr === '::1') return true

  if (addr.startsWith('::ffff:')) {
    const rest = addr.slice(7)
    if (isIP(rest) === 4) return isPrivateV4(rest)
    const [high, low] = rest.split(':')
    const packed = (parseInt(high, 16) << 16) | parseInt(low || '0', 16)
    return isPrivateV4(
      [(packed >>> 24) & 255, (packed >>> 16) & 255, (packed >>> 8) & 255, packed & 255].join('.')
    )
  }

  const first = parseInt(addr.split(':')[0] || '0', 16)
  if ((first & 0xfe00) === 0xfc00) return true
  if ((first & 0xffc0) === 0xfe80) return true
  return (first & 0xff00) === 0xff00
}

function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return isPrivateV4(ip)
  if (version === 6) return isPrivateV6(ip)
  return true
}

const resolutionCache = new Map<string, { public: boolean; expires: number }>()

async function resolvesPublicly(host: string): Promise<boolean> {
  const cached = resolutionCache.get(host)
  if (cached && cached.expires > Date.now()) return cached.public

  let addresses: string[]
  if (isIP(host)) {
    addresses = [host]
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((entry) => entry.address)
    } catch {
      addresses = []
    }
  }

  const ok = addresses.length > 0 && !addresses.some(isPrivateAddress)
  resolutionCache.set(host, { public: ok, expires: Date.now() + HOST_RESOLUTION_CACHE_TTL_MS })
  return ok
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UnsafeUrlError(`Not a valid URL: ${raw}`)
  }

  if (!ALLOWED_SCRAPE_PROTOCOLS.includes(url.protocol)) {
    throw new UnsafeUrlError(`Unsupported protocol: ${url.protocol}`)
  }

  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80
  if (!ALLOWED_SCRAPE_PORTS.includes(port)) {
    throw new UnsafeUrlError(`Unsupported port: ${port}`)
  }

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!host) throw new UnsafeUrlError('URL has no host')

  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(suffix))) {
    throw new UnsafeUrlError(`Host is not routable: ${host}`)
  }

  if (!(await resolvesPublicly(host))) {
    throw new UnsafeUrlError(`Host does not resolve to a public address: ${host}`)
  }

  return url
}

export async function isPublicUrl(raw: string): Promise<boolean> {
  try {
    await assertPublicUrl(raw)
    return true
  } catch {
    return false
  }
}
