import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { analyses, pageSnapshots } from '../db/schema.ts'

/**
 * Fills the local database with enough distinct domains to see the landing page's board and sphere.
 *
 * **Local only, and it exists because the board counts domains rather than analyses.** Every test run
 * measures `example.com`, and `publicLeaderboard` keeps one entry per domain, so a hundred e2e
 * analyses collapse into a single chip and the section stays below `PULSE_MIN_ENTRIES`. That is the
 * intended behaviour, not a bug to work around, which is why this is a script you run on purpose and
 * never a seed the app performs for itself. **Nothing may ever plant rows on a real database**: the
 * board's whole claim is that every entry is a page this tool actually measured. See
 * docs/invariants.md.
 *
 *   npx tsx --env-file=.env scripts/seed-pulse.mts          # plant them
 *   npx tsx --env-file=.env scripts/seed-pulse.mts --clear  # remove them again
 *
 * Every row is tagged with SEED_BRIEF, so `--clear` removes exactly what this planted and nothing a
 * real analysis wrote. The snapshots cascade with the analyses.
 */

const SEED_BRIEF = 'seed:pulse'

// Real names because the point is to judge how the chips read at real lengths -- a sphere of
// `example-1.com` tells you nothing about whether a long hostname fits. Scores are spread across the
// three severity bands so the colouring is exercised too.
const PAGES: [domain: string, score: number][] = [
  ['stripe.com', 94],
  ['github.com', 93],
  ['linear.app', 91],
  ['shopify.com', 90],
  ['vercel.com', 88],
  ['airbnb.com', 86],
  ['raycast.com', 85],
  ['duolingo.com', 84],
  ['cal.com', 82],
  ['spotify.com', 81],
  ['supabase.com', 79],
  ['dropbox.com', 77],
  ['resend.com', 74],
  ['slack.com', 72],
  ['asana.com', 70],
  ['posthog.com', 68],
  ['intercom.com', 66],
  ['mailchimp.com', 63],
  ['framer.com', 61],
  ['typeform.com', 58],
  ['notion.so', 55],
  ['hotjar.com', 52],
  ['figma.com', 48],
  ['zendesk.com', 45],
  ['webflow.com', 41],
  ['hubspot.com', 38],
  ['canva.com', 33],
  ['squarespace.com', 29],
  ['wix.com', 22],
  ['godaddy.com', 18]
]

async function clear() {
  const gone = await db.delete(analyses).where(eq(analyses.brief, SEED_BRIEF)).returning({
    id: analyses.id
  })
  console.log(`Removed ${gone.length} seeded analyses.`)
}

async function seed() {
  const now = Date.now()

  for (const [index, [domain, score]] of PAGES.entries()) {
    // Ownerless, like an analysis someone ran from an ad before signing in, and staggered in time so
    // the feed has an order to show. `structure` is what marks a row measured -- the board reads the
    // snapshot's score, and the feed reads this.
    const [created] = await db
      .insert(analyses)
      .values({
        url: `https://www.${domain}/`,
        brief: SEED_BRIEF,
        structure: {} as never,
        createdAt: new Date(now - index * 60_000)
      })
      .returning({ id: analyses.id })

    await db.insert(pageSnapshots).values({ analysisId: created.id, score })
  }

  console.log(`Seeded ${PAGES.length} domains. Open / and the board should be there.`)
}

async function main() {
  if (process.argv.includes('--clear')) await clear()
  else await seed()

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
