import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isDisallowed, parseRobots } from './robots'
import { guardedFetch } from './guarded-fetch'

const ROBOTS = `User-agent: GPTBot
Disallow: /

User-agent: *
Disallow: /admin
Disallow: /*.json$
Disallow:

Sitemap: https://acme.example/sitemap.xml`

test('the crawl keeps only the rules written for every agent', () => {
  const access = parseRobots(ROBOTS)

  assert.deepEqual(access.blockedAgents, ['GPTBot'])
  assert.equal(access.blocksAll, false)
  assert.deepEqual(access.disallowed, ['/admin', '/*.json$'])
  assert.deepEqual(access.sitemaps, ['https://acme.example/sitemap.xml'])
})

test('a rule matches by prefix, with * for any run and $ for the end', () => {
  const rules = ['/admin', '/*.json$']

  assert.equal(isDisallowed('/admin/users', rules), true)
  assert.equal(isDisallowed('/data/export.json', rules), true)
  assert.equal(isDisallowed('/data/export.json?v=2', rules), false)
  assert.equal(isDisallowed('/pricing', rules), false)
})

test('a private address is refused before any request is made', async () => {
  const response = await guardedFetch('http://127.0.0.1/', {
    timeoutMs: 1_000,
    maxBytes: 1_024,
    maxRedirects: 0,
    headers: {}
  })

  assert.equal(response, null)
})
