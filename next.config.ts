import type { NextConfig } from 'next'

// The card form is Mercado Pago's own, running in the page, so three holes are opened for it and
// each one names the provider rather than widening a rule. `frame-src` is what a card challenge
// renders into. **Nothing else may be added here without the same justification**: the point of the
// policy is that a script we did not write cannot reach an origin we did not name. See
// docs/security.md.
const MERCADOPAGO_SDK = 'https://sdk.mercadopago.com'
const MERCADOPAGO_API = 'https://api.mercadopago.com'

// The form is code split: the SDK pulls the rest of itself, and the card brand icons, from Mercado
// Libre's static host. Leaving it out breaks the form only once the policy is enforced, which is to
// say only in production.
const MERCADOPAGO_STATIC = 'https://http2.mlstatic.com'

// The SDK reports its own telemetry here. Nothing of ours is sent, and blocking it would not stop
// the form working, but a policy that logs a violation on every card entry is a policy nobody reads.
const MERCADOPAGO_TRACKS = 'https://api.mercadolibre.com'

// **The card fields are themselves iframes, served from `secure-fields`.** That is the whole reason
// the number never reaches this origin, and leaving it out breaks the form the moment the policy is
// enforced rather than reported. The rest is where a card challenge renders.
const MERCADOPAGO_FRAME = [
  'https://secure-fields.mercadopago.com',
  'https://www.mercadopago.com',
  'https://www.mercadopago.com.br',
  'https://www.mercadolibre.com'
].join(' ')

/**
 * **`unsafe-eval` is granted to one path and must stay that way.** Mercado Pago's card form
 * evaluates strings, so enforcing the policy without it breaks the checkout; granting it site wide
 * would hand the same power to every other page, including the public report. `/settings` is the
 * only surface that renders the form. See docs/security.md.
 */
const csp = (payment: boolean) => [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${payment ? " 'unsafe-eval'" : ''} ${MERCADOPAGO_SDK} ${MERCADOPAGO_STATIC}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://lh3.googleusercontent.com ${MERCADOPAGO_STATIC}`,
  "font-src 'self' data:",
  `connect-src 'self' ${MERCADOPAGO_SDK} ${MERCADOPAGO_API} ${MERCADOPAGO_STATIC} ${MERCADOPAGO_TRACKS}`,
  `frame-src ${MERCADOPAGO_FRAME}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join('; ')

const CSP_HEADER =
  process.env.CSP_ENFORCE === '1' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'

const securityHeaders = (payment: boolean) => [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: CSP_HEADER, value: csp(payment) }
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer'],

  distDir: process.env.E2E_FIXTURES === '1' ? '.next-e2e' : '.next',
  async headers() {
    // The first match wins, so the checkout's own policy has to be declared before the general one.
    return [
      { source: '/settings', headers: securityHeaders(true) },
      { source: '/:path*', headers: securityHeaders(false) }
    ]
  }
}

export default nextConfig
