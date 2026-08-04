import { readFileSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { db } from '../db'
import { referencePages } from '../db/schema'
import { REFERENCE_INGEST_CONCURRENCY } from '../lib/constants'
import { preprocessHtml, scrapePage } from '../lib/scrape'

// How much of a reference page's copy is worth keeping. The structure record carries the signals the
// playbook reasons over; the digest is only there to make a row readable when auditing the corpus.
const COPY_DIGEST_LENGTH = 1200

const SEED_PATH = path.join(process.cwd(), 'db', 'seeds', 'reference-pages.json')

const SeedSchema = z.array(
  z.object({
    name: z.string().min(1),
    url: z.string().url(),
    source: z.string().min(1)
  })
)

type Seed = z.infer<typeof SeedSchema>[number]

async function ingest(seed: Seed): Promise<boolean> {
  try {
    const { html, structure } = await scrapePage(seed.url)

    await db
      .insert(referencePages)
      .values({
        url: seed.url,
        name: seed.name,
        structure,
        copyDigest: preprocessHtml(html).slice(0, COPY_DIGEST_LENGTH),
        source: seed.source
      })
      .onConflictDoUpdate({
        target: referencePages.url,
        set: {
          name: seed.name,
          structure,
          copyDigest: preprocessHtml(html).slice(0, COPY_DIGEST_LENGTH),
          source: seed.source,
          scrapedAt: new Date()
        }
      })

    console.log(
      `ok    ${seed.name} (oauth=${structure.hasOauth} faq=${structure.hasFaq} fields=${structure.formFieldCount})`
    )
    return true
  } catch (error) {
    // A page that blocks headless Chrome or times out drops out of the corpus. One missing reference
    // weakens the evidence slightly; aborting the batch would leave it half ingested.
    console.error(`FAIL  ${seed.name} (${seed.url}): ${(error as Error).message}`)
    return false
  }
}

async function main() {
  const argv = process.argv.slice(2)

  // Ad-hoc single page: `npm run ingest:references -- https://foo.com "Foo"`. Without arguments the
  // committed seed list is ingested in full.
  const seeds: Seed[] = argv.length
    ? [{ url: argv[0], name: argv[1] ?? new URL(argv[0]).hostname.replace(/^www\./, ''), source: 'manual' }]
    : SeedSchema.parse(JSON.parse(readFileSync(SEED_PATH, 'utf8')))

  console.log(`ingesting ${seeds.length} reference page(s)\n`)

  let ingested = 0
  // Each entry is a full browser launch, so the batch is throttled rather than fanned out.
  for (let i = 0; i < seeds.length; i += REFERENCE_INGEST_CONCURRENCY) {
    const batch = seeds.slice(i, i + REFERENCE_INGEST_CONCURRENCY)
    const results = await Promise.all(batch.map(ingest))
    ingested += results.filter(Boolean).length
  }

  console.log(`\n${ingested} of ${seeds.length} ingested`)
  process.exit(ingested === 0 ? 1 : 0)
}

main()
