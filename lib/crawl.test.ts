import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCrawledPage, sitemapLocs, urlKey } from './crawl'

const HTML = `<!doctype html>
<html>
  <head>
    <title>Pricing &amp; plans</title>
    <meta name="description" content="What Acme costs">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://acme.example/pricing/">
  </head>
  <body>
    <h1>Pricing</h1>
    <p>Three plans for teams of any size.</p>
    <a href="/about">About</a>
    <a href="https://acme.example/pricing#faq">FAQ</a>
    <a href="https://other.example/">Elsewhere</a>
    <a href="/brochure.pdf">Brochure</a>
  </body>
</html>`

test('reads what a page declares from its HTML', () => {
  const page = parseCrawledPage(HTML, 'https://acme.example/pricing', null)

  assert.equal(page.title, 'Pricing & plans')
  assert.equal(page.metaDescription, 'What Acme costs')
  assert.equal(page.noindex, false)
  assert.equal(page.h1Count, 1)
  assert.equal(page.canonicalElsewhere, false, 'a trailing slash is the same page')
  assert.ok(page.wordCount > 5)
})

test('keeps same-origin page links only, without fragments or files', () => {
  assert.deepEqual(parseCrawledPage(HTML, 'https://acme.example/pricing', null).links, [
    'https://acme.example/about',
    'https://acme.example/pricing'
  ])
})

test('noindex is read from the meta tag and from the X-Robots-Tag header', () => {
  const meta = HTML.replace('index, follow', 'noindex, follow')

  assert.equal(parseCrawledPage(meta, 'https://acme.example/pricing', null).noindex, true)
  assert.equal(parseCrawledPage(HTML, 'https://acme.example/pricing', 'noindex').noindex, true)
})

test('a canonical naming another URL is flagged, and a page with no title reads as null', () => {
  const html = HTML.replace('https://acme.example/pricing/', 'https://acme.example/plans').replace(
    /<title>[\s\S]*<\/title>/,
    ''
  )
  const page = parseCrawledPage(html, 'https://acme.example/pricing', null)

  assert.equal(page.canonicalElsewhere, true)
  assert.equal(page.title, null)
})

test('a sitemap yields its locations, CDATA and entities included', () => {
  const xml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://acme.example/</loc></url>
  <url><loc><![CDATA[https://acme.example/pricing]]></loc></url>
  <url><loc>https://acme.example/search?q=a&amp;page=2</loc></url>
</urlset>`

  assert.deepEqual(sitemapLocs(xml), {
    index: false,
    locs: ['https://acme.example/', 'https://acme.example/pricing', 'https://acme.example/search?q=a&page=2']
  })
})

test('a sitemap index is recognised as one', () => {
  const xml = '<sitemapindex><sitemap><loc>https://acme.example/pages.xml</loc></sitemap></sitemapindex>'

  assert.equal(sitemapLocs(xml).index, true)
})

test('one key per page, so a trailing slash or a fragment is not a second page', () => {
  assert.equal(urlKey('https://acme.example/about/'), urlKey('https://acme.example/about#team'))
  assert.notEqual(urlKey('https://acme.example/blog?page=2'), urlKey('https://acme.example/blog'))
})
