import { claimsGeneralTruth, rewriteStats } from '../lib/rewrite-stats.ts'
import { fixtureAnalysis } from '../lib/ai/fixtures.ts'
import { LOCALE, type Verdict } from '../lib/enums.ts'
import { db } from '../db/index.ts'

/**
 * Scores the copy generator against the rewrites it has already produced.
 *
 * **It exists because every judgement about this generator until now was taste.** "That rewrite is
 * worse" is a claim about somebody's landing page, and on that the page's owner is right and we are
 * not, so it cannot decide whether a change to the prompt helped. These numbers are about the
 * generator: they hold across pages and need no model, no credit and no opinion.
 *
 *   npx tsx --env-file=.env scripts/rewrite-stats.mts             # every real analysis
 *   npx tsx --env-file=.env scripts/rewrite-stats.mts --by-run    # one line per run
 *   npx tsx --env-file=.env scripts/rewrite-stats.mts hunch.solutions
 *
 * Read `permutation` as the only hard failure. The rest are rates to compare between runs -- a
 * quarter of rewrites reusing most of their words is the normal case, not a defect. See
 * lib/rewrite-stats.ts.
 */

// Every fixture hypothesis quotes a hardcoded line, so a stored row carrying one came from a run with
// E2E_FIXTURES on. Three of the five analyses in a development database are these, and averaging them
// in would describe the fixtures rather than the generator.
const FIXTURE_COPY = new Set(
  LOCALE.flatMap((locale) => fixtureAnalysis(locale).hypotheses.map((h) => h.current_copy))
)

const args = process.argv.slice(2)
const byRun = args.includes('--by-run')
const filter = args.find((arg) => !arg.startsWith('--'))

const rows = await db.query.analyses.findMany({
  columns: { url: true, createdAt: true, brief: true },
  with: {
    hypotheses: {
      columns: {
        section: true,
        currentCopy: true,
        rationale: true,
        impactScore: true,
        verdict: true
      },
      with: {
        variants: { columns: { copy: true, position: true, createdAt: true, author: true } }
      }
    },
    flowFixes: {
      columns: { kind: true, evidence: true, finding: true, impactScore: true, verdict: true }
    }
  }
})

type Scored = {
  run: string
  section: string
  brief: boolean
  impactScore: number
  verdict: Verdict | null
  /** Whether the model's own recommendation is the one the owner left in place. Null with no alternates. */
  chose: boolean | null
  /** How much of our line survived into the owner's, or null where they wrote none. */
  ownReuse: number | null
  permutation: boolean
  reuseRatio: number
  overWordBudget: boolean
  hasPlaceholder: boolean
  generalTruth: boolean
  currentCopy: string
  copy: string
}

// The same two columns, off the other table. `flow_fixes` carries the flow list and the visibility
// one under its own `kind`, so this covers three of the four tabs the reader sees.
type ScoredFix = {
  run: string
  kind: string
  impactScore: number
  verdict: Verdict | null
  generalTruth: boolean
  anchored: boolean
}

const scored: Scored[] = []
const fixes: ScoredFix[] = []

for (const analysis of rows) {
  const host = analysis.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (filter && !host.includes(filter)) continue

  for (const hypothesis of analysis.hypotheses) {
    if (FIXTURE_COPY.has(hypothesis.currentCopy)) continue

    // **The model's oldest line, not whatever sits at position 0.** The generation writes exactly
    // one variant per hypothesis and the alternates arrive later, so the oldest model row is what
    // was recommended however the owner reorders them afterwards. Scoring position 0 would score
    // their pick, which is the separate question `chose` asks.
    const written = hypothesis.variants
      .filter((variant) => variant.author === 'model')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.position - b.position)
    const recommended = written[0]
    if (!recommended) continue

    // **The owner's own line, and how much of ours survived into it.** The most precise thing this
    // product can know about its own copy, and nobody had to label anything to produce it: it falls
    // out of somebody using the tool. High reuse means the idea was right and the words needed a
    // nudge; low reuse means they threw it out and wrote their own.
    const own = hypothesis.variants.find((variant) => variant.author === 'owner')

    const stats = rewriteStats(hypothesis.currentCopy, recommended.copy)
    scored.push({
      run: `${host} @${analysis.createdAt.toISOString().slice(0, 16).replace('T', ' ')}`,
      section: hypothesis.section,
      brief: analysis.brief !== null,
      impactScore: hypothesis.impactScore,
      verdict: hypothesis.verdict,
      generalTruth: claimsGeneralTruth(hypothesis.rationale),
      // Whether the reader kept what was recommended. Only meaningful once alternates exist, so it
      // is reported over hypotheses that have more than one line to choose between.
      chose: hypothesis.variants.length > 1 ? recommended.position === 0 : null,
      ownReuse: own ? rewriteStats(recommended.copy, own.copy).reuseRatio : null,
      currentCopy: hypothesis.currentCopy,
      copy: recommended.copy,
      ...stats
    })
  }

  // A fixture run writes fixture fixes too, and the copy check above is what identifies one. A run
  // whose hypotheses were all fixtures contributes no fixes either.
  const isFixtureRun = analysis.hypotheses.some((h) => FIXTURE_COPY.has(h.currentCopy))

  for (const fix of isFixtureRun ? [] : analysis.flowFixes) {
    fixes.push({
      run: `${host} @${analysis.createdAt.toISOString().slice(0, 16).replace('T', ' ')}`,
      kind: fix.kind,
      impactScore: fix.impactScore,
      verdict: fix.verdict,
      generalTruth: claimsGeneralTruth(fix.evidence ?? ''),
      anchored: fix.finding !== null
    })
  }
}

if (scored.length === 0) {
  console.log('No real rewrites found. Every stored analysis is a fixture run, or the filter matched nothing.')
  process.exit(0)
}

const pct = (n: number, total: number) => `${Math.round((n / total) * 100)}%`.padStart(4)

function report(label: string, set: Scored[]): void {
  const reuse = set.reduce((total, s) => total + s.reuseRatio, 0) / set.length
  const count = (predicate: (s: Scored) => boolean) => set.filter(predicate).length

  console.log(`\n${label}  (${set.length} rewrites, ${count((s) => s.brief)} with a brief)`)
  console.log(`  mean word reuse            ${`${Math.round(reuse * 100)}%`.padStart(4)}`)
  console.log(
    `  reuse >= 70%               ${pct(count((s) => s.reuseRatio >= 0.7), set.length)}  ${count((s) => s.reuseRatio >= 0.7)}/${set.length}`
  )
  console.log(
    `  permutation (0 new words)  ${pct(count((s) => s.permutation), set.length)}  ${count((s) => s.permutation)}/${set.length}`
  )
  console.log(
    `  over the word ceiling      ${pct(count((s) => s.overWordBudget), set.length)}  ${count((s) => s.overWordBudget)}/${set.length}`
  )
  console.log(
    `  rationale claims general   ${pct(count((s) => s.generalTruth), set.length)}  ${count((s) => s.generalTruth)}/${set.length}`
  )
  console.log(
    `  uses a [placeholder]       ${pct(count((s) => s.hasPlaceholder), set.length)}  ${count((s) => s.hasPlaceholder)}/${set.length}`
  )
  const edits = set.filter((row) => row.ownReuse !== null)
  if (edits.length > 0) {
    const kept = edits.reduce((total, row) => total + (row.ownReuse ?? 0), 0) / edits.length
    console.log(
      `  rewritten by the owner     ${pct(edits.length, set.length)}  ${edits.length}/${set.length}, keeping ${Math.round(kept * 100)}% of our words`
    )
  }

  const choices = set.filter((row) => row.chose !== null)
  if (choices.length > 0) {
    const kept = choices.filter((row) => row.chose).length
    console.log(
      `  recommendation kept        ${pct(kept, choices.length)}  ${kept}/${choices.length} with alternates`
    )
  }

  accepted(set)
}

/**
 * The only line here that is a judgement rather than a shape, and the one every other line exists to
 * be compared against.
 *
 * **The rate is over decided rows, never over all of them.** A null verdict is nobody having looked
 * yet, and counting it as a no would report a brand new analysis as universally rejected.
 */
function accepted(set: { verdict: Verdict | null }[]): void {
  const decided = set.filter((row) => row.verdict !== null)
  if (decided.length === 0) {
    console.log('  accepted                   no verdicts yet')
    return
  }

  const applied = decided.filter((row) => row.verdict === 'applied').length
  console.log(
    `  accepted                   ${pct(applied, decided.length)}  ${applied}/${decided.length} decided of ${set.length}`
  )
}

if (byRun) {
  for (const run of [...new Set(scored.map((s) => s.run))].sort()) {
    report(run, scored.filter((s) => s.run === run))
  }
}

report('ALL', scored)

// The other two tabs. They had never been looked at by anything: the harness was written for copy
// and the playbook and the visibility audit are two of the four lists the reader pays for.
if (fixes.length > 0) {
  for (const kind of [...new Set(fixes.map((f) => f.kind))].sort()) {
    const set = fixes.filter((f) => f.kind === kind)
    const count = (predicate: (f: ScoredFix) => boolean) => set.filter(predicate).length

    console.log(`
flow_fixes [${kind}]  (${set.length} fixes)`)
    console.log(
      `  evidence claims general    ${pct(count((f) => f.generalTruth), set.length)}  ${count((f) => f.generalTruth)}/${set.length}`
    )
    // Not a defect. Plenty of real fixes answer nothing that was counted -- nothing measures "the
    // action is not repeated after the pricing table" -- so this is the share of the list that can
    // point at a number, and it is worth watching rather than maximising.
    console.log(
      `  anchored to a finding      ${pct(count((f) => f.anchored), set.length)}  ${count((f) => f.anchored)}/${set.length}`
    )
    accepted(set)
  }
}

// **The two questions that only exist once verdicts do**, and the second is the one with something
// at stake: `impact_score` orders every list on the screen and nothing has ever checked it. If the
// high band is not accepted more often than the low one, the ordering is decorative.
const decided = [...scored, ...fixes].filter((row) => row.verdict !== null)
if (decided.length > 0) {
  console.log(`
What the verdicts say  (${decided.length} decided)`)

  const rate = (set: { verdict: Verdict | null }[]) =>
    set.length === 0 ? '   -' : pct(set.filter((r) => r.verdict === 'applied').length, set.length)

  const high = decided.filter((row) => row.impactScore >= 7)
  const low = decided.filter((row) => row.impactScore < 7)
  console.log(`  impact 7 to 10 accepted    ${rate(high)}  (${high.length})`)
  console.log(`  impact 1 to 6 accepted     ${rate(low)}  (${low.length})`)

  const rewrites = scored.filter((row) => row.verdict !== null)
  const heavy = rewrites.filter((row) => row.reuseRatio >= 0.7)
  const light = rewrites.filter((row) => row.reuseRatio < 0.7)
  console.log(`  reuse >= 70% accepted      ${rate(heavy)}  (${heavy.length})`)
  console.log(`  reuse < 70% accepted       ${rate(light)}  (${light.length})`)
}

const permutations = scored.filter((s) => s.permutation)
if (permutations.length > 0) {
  console.log('\nPermutations, which propose no idea at all:\n')
  for (const p of permutations) {
    console.log(`  ${p.run} [${p.section}]`)
    console.log(`    was: ${p.currentCopy}`)
    console.log(`    now: ${p.copy}\n`)
  }
}

process.exit(0)
