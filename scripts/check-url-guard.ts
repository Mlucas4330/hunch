import { assertPublicUrl } from '../lib/url-guard'

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
  'http://metadata.internal',
  'http://db.local',
  'ftp://example.com',
  'https://example.com:22',
  'gopher://example.com'
]

const ALLOWED = ['https://example.com', 'http://example.com/pricing', 'https://vercel.com:443']

async function main() {
  let failures = 0

  for (const url of BLOCKED) {
    try {
      await assertPublicUrl(url)
      console.error(`FAIL  allowed a blocked URL: ${url}`)
      failures++
    } catch {
      console.log(`ok    blocked ${url}`)
    }
  }

  for (const url of ALLOWED) {
    try {
      await assertPublicUrl(url)
      console.log(`ok    allowed ${url}`)
    } catch (error) {
      console.error(`FAIL  blocked a public URL: ${url} (${(error as Error).message})`)
      failures++
    }
  }

  console.log(failures === 0 ? '\nall cases passed' : `\n${failures} failing case(s)`)
  process.exit(failures === 0 ? 0 : 1)
}

main()
