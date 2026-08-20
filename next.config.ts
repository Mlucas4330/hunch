import type { NextConfig } from 'next'

// What the Payment Brick actually reaches for, read off a real run rather than guessed: it loads its
// own component bundles from http2.mlstatic.com, calls Mercado Libre's fraud-signal endpoints on two
// domains (.com and .com.br), and frames mercadolibre.com -- which is why frame-src is no longer
// 'none'. A host missing here is a checkout that dies silently once CSP_ENFORCE is on.
// See docs/security.md.
const MERCADOPAGO = {
  script: ['https://sdk.mercadopago.com', 'https://http2.mlstatic.com'],
  connect: [
    'https://api.mercadopago.com',
    'https://api.mercadolibre.com',
    'https://http2.mlstatic.com',
    'https://www.mercadolibre.com',
    'https://www.mercadolivre.com'
  ],
  img: ['https://http2.mlstatic.com', 'https://www.mercadolibre.com', 'https://www.mercadolivre.com'],
  frame: ['https://sdk.mercadopago.com', 'https://www.mercadolibre.com']
}

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${MERCADOPAGO.script.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://lh3.googleusercontent.com ${MERCADOPAGO.img.join(' ')}`,
  "font-src 'self' data:",
  `connect-src 'self' ${MERCADOPAGO.connect.join(' ')}`,
  `frame-src ${MERCADOPAGO.frame.join(' ')}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join('; ')

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: process.env.CSP_ENFORCE === '1'
      ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only',
    value: CSP
  }
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer'],

  distDir: process.env.E2E_FIXTURES === '1' ? '.next-e2e' : '.next',
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  }
}

export default nextConfig
