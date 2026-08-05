import type { NextConfig } from 'next'

// Next inlines its own bootstrap script and Tailwind emits inline styles, so a nonce-free policy
// needs 'unsafe-inline'. Rather than ship a policy that is wrong in either direction, it is sent
// report-only until CSP_ENFORCE=1: violations show up in the console without breaking the app.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
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
  // Emitted as a self-contained server bundle so the runtime image carries only what it needs
  // instead of all of node_modules.
  output: 'standalone',
  serverExternalPackages: ['puppeteer'],
  // Variant previews are written to a local volume and served from our own origin, so they need no
  // remotePatterns entry and no img-src host: 'self' already covers both. That is the whole reason
  // they are not on object storage -- see README.

  // Isolate the e2e dev server's build output so it never contends with a
  // separately running `npm run dev` over the shared .next/cache.
  distDir: process.env.E2E_FIXTURES === '1' ? '.next-e2e' : '.next',
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      // embed.js is meant to be loaded by any customer's landing page, so the restrictive
      // defaults above would defeat the product.
      {
        source: '/embed.js',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Access-Control-Allow-Origin', value: '*' }
        ]
      }
    ]
  }
}

export default nextConfig
