import type { NextConfig } from 'next'

// The card form is Mercado Pago's own, running in the page, so the policy names every host it
// reaches and nothing wider. **Nothing may be added here without the same justification**: the point
// of the policy is that a script we did not write cannot reach an origin we did not name. Every host
// below was observed from a real checkout rather than taken from documentation, because the
// documentation does not list them. See docs/security.md.
const MERCADOPAGO_SDK = 'https://sdk.mercadopago.com'
const MERCADOPAGO_API = 'https://api.mercadopago.com'

// The form is code split: the SDK pulls the rest of itself, and the card brand icons, from here.
const MERCADOPAGO_STATIC = 'https://http2.mlstatic.com'

// The SDK's own telemetry. Nothing of ours is sent.
const MERCADOPAGO_TRACKS = 'https://api.mercadolibre.com'

// **The card fields are iframes served from here, and they also call home.** That separation is why
// the number never reaches this origin, which is why it needs both `frame-src` and `connect-src`.
const MERCADOPAGO_FIELDS = 'https://secure-fields.mercadopago.com'

// **The provider's anti-fraud check fingerprints the device**, with a request and a tracking pixel,
// on the Spanish and the Brazilian domain alike. Blocking it is not harmless: the SDK expects an
// answer, fails reading one that never came, and the reader is left with a form that does nothing.
const MERCADOPAGO_ANTIFRAUD = ['https://www.mercadolibre.com', 'https://www.mercadolivre.com']

// Where a card challenge renders.
const MERCADOPAGO_CHALLENGE = [
  'https://www.mercadopago.com',
  'https://www.mercadopago.com.br',
  'https://www.mercadolibre.com'
]

const hosts = (...values: (string | string[])[]) => values.flat().join(' ')

/**
 * **`unsafe-eval` is granted to one path and must stay that way.** Mercado Pago's card form
 * evaluates strings, so enforcing the policy without it breaks the checkout; granting it site wide
 * would hand the same power to every other page, including the public report. `/settings` is the
 * only surface that renders the form. See docs/security.md.
 */
const csp = (payment: boolean) =>
  [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${payment ? " 'unsafe-eval'" : ''} ${hosts(MERCADOPAGO_SDK, MERCADOPAGO_STATIC)}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://lh3.googleusercontent.com ${hosts(MERCADOPAGO_STATIC, MERCADOPAGO_ANTIFRAUD)}`,
    "font-src 'self' data:",
    `connect-src 'self' ${hosts(
      MERCADOPAGO_SDK,
      MERCADOPAGO_API,
      MERCADOPAGO_STATIC,
      MERCADOPAGO_TRACKS,
      MERCADOPAGO_FIELDS,
      MERCADOPAGO_ANTIFRAUD
    )}`,
    `frame-src ${hosts(MERCADOPAGO_FIELDS, MERCADOPAGO_CHALLENGE)}`,
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
    // **When two rules match one path and set the same header, the later one wins.** So the
    // checkout's policy is declared after the general one, never before it: the other order serves
    // `/settings` the general policy, and the card form breaks only once the policy is enforced.
    return [
      { source: '/:path*', headers: securityHeaders(false) },
      { source: '/settings', headers: securityHeaders(true) }
    ]
  }
}

export default nextConfig
