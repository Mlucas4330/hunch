import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertPublicUrl } from './url-guard'

const BLOCKED = [
  'file:///etc/passwd',
  'http://localhost',
  'http://localhost:5432',
  'http://127.0.0.1',
  'http://127.0.0.1:8080',
  'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
  'http://[::1]',
  'http://10.0.0.1',
  'http://192.168.1.1',
  'http://172.16.0.1',
  'http://100.64.0.1',
  'http://2130706433',
  'http://0x7f000001',
  'http://0177.0.0.1',
  'http://[::ffff:127.0.0.1]',
  'http://[fd00::1]',
  'http://[fe80::1]',
  'http://metadata.internal',
  'http://db.local',
  'ftp://example.com',
  'https://example.com:22',
  'gopher://example.com'
]

// IP literals, not hostnames, so the suite never touches the network: resolvesPublicly short-circuits
// on isIP() and skips the lookup entirely, while still running the full range classification -- which
// is the only thing here worth asserting.
//
// The hostname cases these replaced (example.com, vercel.com) did a real DNS query and bought
// nothing: the rule that branch exists for is "every returned address must be public, not just the
// first", and no public domain answers with a private address, so they never exercised it. What they
// did buy was a suite that fails offline and a CI that goes red when someone else's DNS wobbles.
const ALLOWED = [
  'http://1.1.1.1',
  'http://1.1.1.1/pricing',
  'https://8.8.8.8:443',
  'http://[2606:4700:4700::1111]'
]

for (const url of BLOCKED) {
  test(`refuses ${url}`, async () => {
    await assert.rejects(() => assertPublicUrl(url))
  })
}

for (const url of ALLOWED) {
  test(`allows ${url}`, async () => {
    await assert.doesNotReject(() => assertPublicUrl(url))
  })
}
