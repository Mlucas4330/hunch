import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickNeighbours } from './site-pages'
import { SITE_PAGE_MAX } from './constants'
import type { PageLink } from './scrape'

const PAGE = 'https://acme.com/'

function link(href: string, text = ''): PageLink {
  return { href: `https://acme.com${href}`, text }
}

test('the pages carrying what a landing page leaves out are the ones chosen', () => {
  const chosen = pickNeighbours(
    [link('/', 'Acme'), link('/precos', 'Preços'), link('/docs', 'Documentação')],
    PAGE
  )

  assert.deepEqual(
    chosen.map((page) => page.id),
    ['pricing', 'docs']
  )
})

test('the path counts when the anchor is an icon', () => {
  const chosen = pickNeighbours([link('/pricing', ''), link('/blog/post', 'Read this')], PAGE)

  assert.deepEqual(chosen.map((page) => page.id), ['pricing'])
})

// The commonest match on any page, and the one that would spend a browser slot re-reading the page
// that was just measured: a logo, a nav item marked current, a "back to home".
test('a link back to the page being measured is never one of them', () => {
  const chosen = pickNeighbours([link('/', 'Preços e planos'), link('/sobre', 'Sobre')], PAGE)

  assert.deepEqual(chosen.map((page) => page.id), ['about'])
})

test('a trailing slash is the same page, and so is a campaign tag', () => {
  const chosen = pickNeighbours(
    [
      { href: 'https://acme.com/precos/', text: 'Planos' },
      { href: 'https://acme.com/precos', text: 'Preços' }
    ],
    PAGE
  )

  assert.equal(chosen.length, 1)
})

test('one page of each kind, never two prices', () => {
  const chosen = pickNeighbours([link('/precos', 'Preços'), link('/planos', 'Planos')], PAGE)

  assert.deepEqual(chosen.map((page) => page.id), ['pricing'])
})

// The cap is what keeps this a selection rather than a crawl, and it is the reader's wait.
test('a site that matches everything still costs at most the cap', () => {
  const chosen = pickNeighbours(
    [
      link('/precos', 'Preços'),
      link('/docs', 'Docs'),
      link('/recursos', 'Recursos'),
      link('/sobre', 'Sobre'),
      link('/faq', 'FAQ')
    ],
    PAGE
  )

  assert.equal(chosen.length, SITE_PAGE_MAX)
})

test('a page linking nowhere recognisable opens nothing', () => {
  assert.deepEqual(pickNeighbours([link('/blog/2', 'A post'), link('/careers', 'Jobs')], PAGE), [])
})

// Same-origin filtering happens in the browser, where `location.origin` is known. A link that got
// through anyway must not become a page this deploy opens on somebody else's host.
test('a malformed href is dropped rather than resolved against something', () => {
  assert.deepEqual(pickNeighbours([{ href: 'not a url', text: 'Preços' }], PAGE), [])
})
