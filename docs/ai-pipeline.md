# AI pipeline

Three `generateObject` calls in one `Promise.all`: copy errors, structure errors, and SEO and AI
visibility errors. `lib/ai/` and `lib/analyze.ts`.

**Every call points out errors and none of them writes a fix.** The schemas have no field for
replacement copy, steps or a prompt, and `noFixRules()` in `lib/ai/prompt.ts` tells each model not to
describe what to add, remove, rewrite or change. What the agency does about an error is its work.

**There is no web-search step.** A comparison exists only against a page the reader named:
`measureCompetitor` scrapes it and runs PageSpeed Insights on it. Nothing infers a competitor.

## 1. Preprocess

Strip scripts, styles and meta tags; extract semantic text only.

### The text budget is stated, and truncation is declared

`preprocessHtml` does not truncate. Three pieces own the budget:

- **`PROMPT_TEXT_MAX_CHARS`** in `lib/constants.ts`.
- **`composePageText`** in `lib/page-text.ts` assembles the text from `PageSection[]` and drops from the
  **middle** when it will not fit, keeping the opening and the last `PROMPT_SECTIONS_KEEP_TAIL` blocks,
  where pricing and FAQ live.
- **`coverageNote`** appends what was left out, by heading, with the instruction never to state the
  page lacks something that was not shown. See
  [invariants.md](invariants.md#unknown-is-never-reported-as-negative).

The counts beside the text are measured over the **whole** page, so `hasPricing` and `hasFaq` settle
the question even for a section the budget could not carry.

### `evidenceRules` is shared by all three prompts

What may be concluded from missing text, and the ban on assuming how the product is sold.

### Elements are chosen by what they are, not where they sit

`promptElements` in `lib/prompt-elements.ts` admits every heading and every `a`/`button` first, fills
the rest with body copy, and **sorts back into document order.** The list reaches the copy prompt as
`<tag> "text"` lines.

### The reader's other pages are read, when they exist

`measureNeighbours` opens at most `SITE_PAGE_MAX` same-origin pages recognised as pricing, docs,
features, about or faq, for their text alone. **It selects, it never crawls**, and nothing from those
pages reaches the readout. They go to the copy call only.

## 2. Schemas

```typescript
const HypothesisSchema = z.object({
  section: z.enum(SECTIONS).catch(SECTION_FALLBACK),
  current_copy: z.string(),
  assessment: z.string(),
  problem: z.string(),
  impact_score: z.number().int().min(1).max(10),
  rationale: z.string()
})

const fixFields = {
  title: z.string(),
  problem: z.string(),
  impact_score: z.number().int().min(1).max(10),
  evidence: z.string(),
  finding: z.string().nullable().catch(null)
}
```

`AnalysisOutputSchema` has no floor and a `HYPOTHESES_MAX` ceiling. `PlaybookOutputSchema` takes
`PLAYBOOK_MIN` to `PLAYBOOK_MAX` structure errors; `VisibilityOutputSchema` has no floor.

### The key order of a hypothesis is behaviour, not formatting

A structured output is written in declaration order, so the object above makes the model **quote the
line, say what it already does, and only then name the error.** `lib/ai/schema.test.ts` asserts the
order, because nothing at runtime would complain if it were sorted.

### A quoted line is checked against the page, and an unmatched one drops the card

`current_copy` must be the verbatim text of one element. `resolveTargets` in `lib/analyze.ts` drops any
hypothesis whose quote matches no element, with a `console.warn`: the card renders the quote as what
the page says today, so a paraphrase would be a sentence the page never carried.
`e2e/unquoted-copy.spec.ts` walks the drop.

**`found` and `mode` answer different questions.** `resolveTarget` decides `found` by containment and
only then decides whether the match is close enough to point a selector at (`auto`) or not (`manual`).

### `assessment` makes it possible for a line to pass

Without a field for what the line already does, a line doing its job has no way to survive the pass.
`assessmentRules()` states the outcome: **if the verdict is that the line works, there is no error and
nothing is returned about it.**

### `impactScoreRules()` says what the number measures

How much **this error** costs the page, never the importance of the element it sits on. An error that
barely costs anything is not returned at all.

### `finding` ties an error to the number behind it

`findingsSection` hands each fix generator the readout finding ids it can act on, and
`pageSpeedSection` hands it the PageSpeed audits that failed in its categories, each with its id.
`findingRules()` asks the model to name the one finding or audit an error answers, or null.

**`finding` is a plain string that degrades to null on a malformed value**, and
`keepKnownFindings` in `lib/analyze.ts` nulls any id the prompt was not actually given. The schema
cannot check an open list of Lighthouse ids; code can, on the way back. The report then links each
number to the errors written about it; see [readout.md](readout.md).

**`section` also degrades instead of rejecting**, because it only picks a badge. `category` keeps
rejecting, because it decides which list an error lands in. The score bounds keep rejecting too.

## 3. Copy errors: `systemPrompt`

It assesses the page's lines and returns the ones that are not doing their job, each quoting one
element verbatim. **There is no minimum**: a page whose lines mostly work comes back short. Structural
problems are produced by the playbook and must not appear here.

## 4. Structure errors: `generatePlaybook`

Fed the structure readout, the phone viewport, what the page cost to load, the readout findings for
`structure`, `credibility`, `mobile` and `load`, and the PageSpeed audits that failed in the
`PAGESPEED_CATEGORY_BY_FIX_KIND.flow` categories. **Resolves to `[]` on any failure.**

- Never report as missing something the readout says the page has.
- A form is not a signup: nothing about authentication unless the page signs people in.
- `category` includes `mobile`, `performance` and `distinctiveness`. The sameness marks reach it as
  context under `samenessRules()` and never as findings, because every mark is `ok`.

## 5. Visibility errors: `generateVisibility`

Fed `PageSeo`, the composed page text, the readable-content counts, the robots.txt result, the
`declared`, `crawler_access`, `site` and `index` findings, the PageSpeed audits in the
`PAGESPEED_CATEGORY_BY_FIX_KIND.visibility` categories, the page's own repeated terms, a summary of the
site crawl, and SE Ranking's estimates for the domain and for the competitor. The report shows those
audits and cards in the section the errors land in; see
[invariants.md](invariants.md#a-section-shows-the-audits-its-errors-were-written-from).
**Resolves to `[]` on any failure.** Its budget is `VISIBILITY_MAX_TOKENS`.

**A site error rests on a `site` finding.** Each one reaches the prompt with up to
`CRAWL_PROMPT_URLS_MAX` of its URLs, and when the crawl's HTML is a JavaScript shell the prompt is told
to say nothing about titles, headings or words across the site.

**Backlink and ranking errors rest on SE Ranking's block**, capped at `RANKED_KEYWORDS_PROMPT_MAX`
keywords a side. The prompt calls those numbers estimates, forbids promising a position or traffic,
and forbids inventing a keyword. See
[invariants.md](invariants.md#index-numbers-say-where-they-came-from).

`site_health`, `backlinks` and `rankings` join `indexability`, `metadata` and `structured_data` in the
SEO list; `ai_answerability` alone goes to the AI list.

**The page text is what makes `ai_answerability` honest.** Without it the call judges whether the page
states what it costs against a body it was never given. A blocked AI crawler or a noindex is ranked
highest; an `unknown` robots.txt is never mentioned.

## 6. Market

`marketRules(market)` tells each prompt which market the page sells in. Detection is `lib/market.ts`,
see [invariants.md](invariants.md#the-market-is-measured-from-the-page-never-taken-from-the-ui-locale).

## 7. Output language and voice

Each prompt takes a language name (`AI_OUTPUT_LANGUAGE[locale]`). `writingRules` restricts language and
punctuation, see [invariants.md](invariants.md#pt-br-is-a-rewrite-not-a-translation); `voiceRules`
forbids the habits that make a sentence read as machine written. They are separate fragments because
they are edited for different reasons.

## 8. What a failure costs

All three generators degrade to an empty list, so one failing call never takes the other two down.
`runAnalysis` writes `failed_at` only when **nothing at all** came back, or when the generation threw.
That run does not count against the quota. See [report.md](report.md).
