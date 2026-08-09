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
