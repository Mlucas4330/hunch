import { readFileSync } from 'node:fs'
import { claimsGeneralTruth, rewriteStats } from '../lib/rewrite-stats.ts'
import { composeBrief, type BriefParts } from '../lib/brief.ts'
import { generateFromMeasurement, measurePage } from '../lib/analyze.ts'
import { tokens } from '../lib/text.ts'

/**
 * The brief arm of the generator, measured against the arm that has always run.
 *
 * `analyses.brief` is null in every real analysis this database holds, so half of `variantCopyRules`
 * has never executed. This scrapes the page once and generates from that single measurement several
 * times with the brief and several times without, which is the only way the two arms differ by the
 * brief alone: a second scrape would change the input under the comparison.
 *
 *   npx tsx --env-file=.env scripts/brief-ab.mts https://hunch.solutions brief.json 2
 *
 * The JSON is the four fields of BRIEF_FIELD. **It has to carry facts the page does not**, or the
 * test measures whether saying the same thing twice helps. It does not.
 *
 * It spends real tokens, writes no row and takes no credit. It stays because the rule it produced --
 * a credit is not spent without the four answers -- is only defensible while the run behind it can be
 * repeated. See docs/ai-pipeline.md.
 */

const [url, briefPath, runsArg] = process.argv.slice(2)
if (!url || !briefPath) {
  console.error('usage: brief-ab.mts <url> <brief.json> [runs per arm]')
  process.exit(1)
}

const runs = Number(runsArg ?? 2)
const parts = JSON.parse(readFileSync(briefPath, 'utf8')) as BriefParts
const brief = composeBrief(parts)

console.log(`Measuring ${url} once, then ${runs} generations per arm.\n`)
console.log(brief, '\n')

const measured = await measurePage(url)

// The words the brief carries and the page does not. **This is the question, and word reuse only
// approximates it**: a variant is only using the brief if it says something the page could not have
// said on its own, and that is exactly this vocabulary reaching the copy.
const pageWords = new Set(measured.elements.flatMap((element) => tokens(element.text)))
const briefOnly = new Set(tokens(brief).filter((word) => !pageWords.has(word) && word.length > 3))

type Row = {
  arm: string
  run: number
  reuseRatio: number
  permutation: boolean
  overWordBudget: boolean
  hasPlaceholder: boolean
  generalTruth: boolean
  fromBrief: string[]
  currentCopy: string
  copy: string
}

const rows: Row[] = []

for (const arm of ['with brief', 'no brief']) {
  for (let run = 1; run <= runs; run++) {
    const result = await generateFromMeasurement(url, measured, {
      brief: arm === 'with brief' ? brief : undefined
    })

    for (const hypothesis of result.hypotheses) {
      const recommended = hypothesis.variants[0]
      if (!recommended) continue

      rows.push({
        arm,
        run,
        generalTruth: claimsGeneralTruth(hypothesis.rationale),
        fromBrief: [...new Set(tokens(recommended.copy).filter((word) => briefOnly.has(word)))],
        currentCopy: hypothesis.current_copy,
        copy: recommended.copy,
        ...rewriteStats(hypothesis.current_copy, recommended.copy)
      })
    }

    console.log(`${arm} #${run}: ${result.hypotheses.length} hypotheses`)
  }
}

const pct = (n: number, total: number) => `${Math.round((n / total) * 100)}%`.padStart(4)

for (const arm of ['no brief', 'with brief']) {
  const set = rows.filter((row) => row.arm === arm)
  const count = (predicate: (row: Row) => boolean) => set.filter(predicate).length
  const reuse = set.reduce((total, row) => total + row.reuseRatio, 0) / set.length

  console.log(`\n${arm}  (${set.length} rewrites)`)
  console.log(`  mean word reuse            ${`${Math.round(reuse * 100)}%`.padStart(4)}`)
  console.log(`  reuse >= 70%               ${pct(count((r) => r.reuseRatio >= 0.7), set.length)}`)
  console.log(`  permutation (0 new words)  ${pct(count((r) => r.permutation), set.length)}`)
  console.log(`  over the word ceiling      ${pct(count((r) => r.overWordBudget), set.length)}`)
  console.log(`  rationale claims general   ${pct(count((r) => r.generalTruth), set.length)}`)
  console.log(`  uses a [placeholder]       ${pct(count((r) => r.hasPlaceholder), set.length)}`)
  console.log(`  says a word only the brief ${pct(count((r) => r.fromBrief.length > 0), set.length)}`)
}

console.log('\nEvery rewrite:\n')
for (const row of rows) {
  console.log(`  [${row.arm} #${row.run}]${row.fromBrief.length > 0 ? ` brief: ${row.fromBrief.join(' ')}` : ''}`)
  console.log(`    was: ${row.currentCopy}`)
  console.log(`    now: ${row.copy}\n`)
}

process.exit(0)
