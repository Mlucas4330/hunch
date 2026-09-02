# AI pipeline

Three `generateObject` calls in one `Promise.all` — hypotheses, playbook, visibility audit. `lib/ai/`.

**There is still no web-search step, and there never will be one.** It used to run a Haiku call with
the `web_search` tool before generation, and it was roughly half the cost of an analysis: search is
agentic, so each of its three rounds resent the conversation plus the content of the results. Removing
it took a run from about $0.17 to about $0.09. Cost is why it went; it is not why it stays gone. What
it produced was a model's recollection of what competitors do, presented beside numbers this code had
counted, and the two were indistinguishable to a reader.

**Comparison against a competitor exists again, and it is the inverse of that.** The reader supplies
a URL, `measureCompetitor` scrapes it, and `lib/readout.ts` counts the same facts off it — so the
prompts still argue only from pages this code measured, and now there can be two of them. Nothing
infers a competitor and nothing searches for one: no URL, no comparison. See
[invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured).

The prompts are the core IP and iterate carefully. Everything they may **not** say is in
[invariants.md](invariants.md#generation).

## 1. Preprocess

Strip scripts, styles and meta tags; extract semantic text only.

### The text budget is stated, and truncation is declared

`preprocessHtml` used to end in `.slice(0, 8000)`. No caller knew, no doc said so, and the effect was
that every prompt in the product received the top third of a long page and was told nothing about the
rest. That is not a size limit, it is an undeclared blind spot: a model handed the first third of a
page will report that the pricing is missing, that there is no FAQ, that nothing says what the product
costs — which is
[unknown reported as negative](invariants.md#unknown-is-never-reported-as-negative), committed by a
`slice`. Our own report did exactly this to our own page.

Three pieces now:

- **`PROMPT_TEXT_MAX_CHARS`** (48k) in `lib/constants.ts`. `preprocessHtml` only flattens; whoever
  builds a prompt owns the budget.
- **`composePageText`** in `lib/page-text.ts` assembles the text from `PageSection[]` and drops from
  the **middle** when it will not fit, keeping the opening and the last `PROMPT_SECTIONS_KEEP_TAIL`
  blocks. Pricing, FAQ and the closing call to action live at the bottom of a landing page, and a
  tail truncation throws away exactly the part a conversion audit needs. A row measured before
  `captureSections` existed has no sections and falls back to a flat cut.
- **`coverageNote`** appends what was left out, by heading, plus the instruction that makes the
  naming useful: never state the page lacks something you were not shown. Nothing is appended when
  everything fit — a note that appears every time is a note nobody reads.

The counts that back this up are measured over the **whole** page and travel beside the text, so
`hasPricing` and `hasFaq` settle the question even for a section the budget could not carry.

### `evidenceRules` is shared by all three prompts

Beside `marketRules` and `competitorRules` in `lib/ai/prompt.ts`, and for the same reason: the risk
is identical wherever page content reaches a model and three wordings of it would drift. It carries
two halves that fail differently — what may be concluded from missing text, and the ban on inventing
how the product is sold. The second is not implied by the first, and it is the one that produced a
recommendation to add a cancellation guarantee to a product with no subscription.

### Elements are chosen by what they are, not where they sit

`captureElements` returns in document order, so the old `.slice(0, MAX_PROMPT_ELEMENTS)` kept the top
of the page. On a long page the closing call to action was element four hundred and no variant could
ever be written for it. `promptElements` in `lib/prompt-elements.ts` admits every heading and every
`a`/`button` first, fills the rest with body copy, and **sorts back into document order** — priority
decides what survives, never what order the model reads.

```
H1: ...
Subheadline: ...
CTA button: ...
Feature: ...
Testimonial: ...
Pricing: ...
```

A founder `brief`, when present, is appended to the generation prompt so variants use real facts and
come back finished rather than as `[placeholder]` templates.

**It is still one free text column, and the form now asks four questions into it.** `analyses.brief`
was a blank textarea, which asked the reader to guess what was useful, and most of them wrote nothing.
`composeBrief` in `lib/brief.ts` folds the four `BRIEF_FIELD` answers into one labelled string
(`Audience: ...`, `Offer: ...`, `Action: ...`, `Objection: ...`) and `parseBrief` reads it back for
the form. Nothing downstream changed: the prompts still receive prose.

The labels are written in English at every locale, deliberately. They are read by the model and never
by the reader, so translating them would make the same brief parse differently depending on which
language the analysis happened to run in. `parseBrief` also has to stay forgiving — every brief
written before the fields existed is one unlabelled paragraph, and those are the rows carrying real
business detail, so anything unrecognised lands in `audience` intact rather than being dropped.

## 2. Schemas

```typescript
const VariantSchema = z.object({
    copy: z.string(),
    evidence: z.string(),
    emphasis: z.string().nullable()
})

const HypothesisSchema = z.object({
    section: z.enum(SECTIONS).catch(SECTION_FALLBACK),
    current_copy: z.string(),
    assessment: z.string(),
    problem: z.string(),
    variants: z.array(VariantSchema).length(1),
    impact_score: z.number().int().min(1).max(10),
    rationale: z.string()
})

const AnalysisOutputSchema = z.object({
    hypotheses: z.array(HypothesisSchema).max(HYPOTHESES_MAX)
})

const AlternateVariantsSchema = z.object({ variants: z.array(VariantSchema).length(2) })
```

### The key order of a hypothesis is behaviour, not formatting

A structured output is written in the order its fields are declared, so the object above is the shape
of a judgement: **quote the line, say what it already does, name what it still leaves undone, and only
then write the replacement.** `problem` used to be first, which had the model naming a defect before
it had transcribed the line the defect was in.

Nothing at runtime complains if someone sorts these alphabetically, and the analysis would go back to
arguing before it had looked. `lib/ai/schema.test.ts` asserts the order for that reason, and it is the
only thing that would catch the change.

### A quoted line is checked against the page, and an unmatched one drops the card

`current_copy` must be the verbatim text of one element from the list the prompt was handed. The
prompt says so, Zod sees a plain string, and the card renders that quote **struck through as what the
page says today** — so a paraphrase, or two elements merged, is generated text presented as a
measurement, which [invariants.md](invariants.md) forbids.

`resolveTargets` in `lib/analyze.ts` therefore drops any hypothesis whose quote matches no element,
with a `console.warn` naming it. **It is the same check `groundTerms` runs on ad terms**, in the same
place and for the same stated reason: the prompt asks and cannot guarantee, so the guarantee is made
on the way back. The cost is real — a usable rewrite is lost to a transcription slip — and the
alternative is telling somebody their page says something it does not.

**`found` and `mode` answer different questions and are allowed to disagree.**
`resolveTarget` in `lib/prompt-elements.ts` decides `found` by containment: a quote that is a
substring of an element, or contains one, is on the page. Only then does `TARGET_MATCH_MAX_WORD_RATIO`
decide whether the two are close enough in length to point a selector at, and failing that gives
`manual`. Deciding both with the ratio would call a four-word quote of a six-word heading "not on this
page", and now that a missing quote deletes the card it would delete a real one.

So `manual` still means exactly what it always meant — we cannot point at it — and it covers a line
the page says twice, an ambiguous near match, and a fragment too short to swap. What it no longer
covers is a line that is not there.

It lives in `lib/prompt-elements.ts` beside `promptElements` because the two are one round trip: the
element list leaves through one and comes back through the other. Both import from `lib/scrape.ts`
**type-only**, for the reason `lib/competitor.ts` documents — a value import pulls puppeteer in, and
that is also what makes these testable.

### `assessment` is the half of the comparison that was never asked for

The prompt defined `problem` as one sentence naming the gap, and **nothing anywhere invited the model
to say what the current line gets right.** A brief asking only for faults produces only faults: a line
already doing its job had no way to survive the pass, so every element that got looked at came back
rewritten. That is how a founder who had just followed this product's own advice was told to undo it.

It is a field rather than an instruction because a judgement that is not written down cannot be
checked, by the reader or by us. `assessmentRules()` states the outcome it exists to make possible:
**if the verdict is that the line is doing its job, there is no finding and the element is dropped.**

It renders in the "why" drawer above `rationale`, labelled, for the reason `evidence` is labelled —
see [components.md](components.md). The column is nullable: rows written before the field existed have
none, and null renders as no verdict rather than as a label over nothing.

**No prompt asks for an effort score.** It was removed from both schemas, from all three prompts and
from the two columns, because a model that has read one page cannot know what applying a change costs
on someone else's stack — see
[analysis-ui.md](analysis-ui.md#nothing-shows-an-effort-score-anywhere). Ranking is `impact_score`
alone.

### `impactScoreRules()` says what the number measures

The three prompts used to carry the identical line `impact_score is an integer from 1 to 10` and
nothing else: a range, never a meaning. With no definition the number drifts to the **importance of
the thing being changed**, so an h1 scores high for being an h1 and a debatable rewrite of the hero
outranks a small correction that is certainly right. An 8 beside a replacement its own author would
not ship is that drift, not a miscalculation.

The shared helper says it is the gain from making *this* change, that a marginal improvement scores
low wherever it sits, and — the clause that ties it to the ceilings — that an item scoring low because
it barely gains anything **should not be returned at all**. Calibration alone would only relabel the
padding with low numbers.

Shared by all three generators for the reason `marketRules` and `evidenceRules` are: one rule, three
callers, so a later edit cannot leave three wordings behind.

This also closes a question that stood open here: asking for implementation cost may have been helping
calibrate `impact_score` by forcing the tradeoff, and nothing replaced it when the effort score was
removed. Something does now.

```typescript

const fixFields = {
    title: z.string(),
    problem: z.string(),
    steps: z.array(z.string()).min(2).max(PLAYBOOK_STEPS_MAX),
    impact_score: z.number().int().min(1).max(10),
    evidence: z.string(),
    finding: z.enum(READOUT_FINDING).nullable().catch(null)
}

const FlowFixSchema = z.object({ category: z.enum(FLOW_FIX_CATEGORY), ...fixFields })

const PlaybookOutputSchema = z.object({
    fixes: z.array(FlowFixSchema).min(PLAYBOOK_MIN).max(PLAYBOOK_MAX)
})

const VisibilityFixSchema = z.object({ category: z.enum(VISIBILITY_FIX_CATEGORY), ...fixFields })
const VisibilityOutputSchema = z.object({ fixes: z.array(VisibilityFixSchema).max(VISIBILITY_MAX) })
```

### `finding` is what ties a fix to the number that caused it

Both fix families carry it, and it is the field that stops the report being two disjoint lists about
one page. The readout counts 43 things above the tabs; the fix lists carry up to 20 cards below; until
this existed, nothing tied one to the other and the reader did the join by recognising the words —
"form has 7 fields" up here, "cut the form to three" down there.

The generator always had the numbers. `findingsSection` in `lib/analyze.ts` now also hands it the
**ids and severities**, narrowed to the groups that generator can act on, and `readoutRules` in
`lib/ai/prompt.ts` — shared by both prompts for the same reason `marketRules` is — carries three
rules: name the one finding the fix answers, never attach one to a finding whose severity is `ok`,
and do not restate the measurement in `problem`. That last one is what kills the duplication: eleven
of the fifteen `declared` and `crawler_access` findings had a fix category covering the same subject,
and the fix's own sentence would repeat the tile the reader had just read.

**`null` is a correct and common answer.** Nothing measures whether an action is repeated below the
pricing table, so a fix about that names no finding.

**It costs input tokens and not output ones.** `maxTokens` caps the completion, so serializing the
findings in grows the prompt, never the budget the answer has to fit inside; the only growth on the
output side is one short id per fix.

**`section` is not the only field that degrades any more — `finding` does too, for the same reason.**

**`section` is the one field that degrades instead of rejecting.** It only picks a badge colour, so an
unrecognized value costs one mislabelled pill, while rejecting it throws away every other hypothesis
plus the generation call already paid for. `.catch` does not strip the enum from the JSON schema, so
the model is still told the exact allowed values — and it covers a missing or null value too, which is
why the parsed type stays a plain `Section`.

The failure it exists for was caused by the prompt: the element list used to format each line as
`(h2) "text"`, and the model read that tag as the section label and returned `section: 'h2'`. The list
now uses `<tag> "text"` and `systemPrompt` says outright that an HTML tag is not a section value — but
a schema that survives the next such slip is the actual guarantee.

`finding` uses `.catch(null)` on exactly that reasoning, and the stakes are higher: a hallucinated id
would reject the whole `generateObject` call, and both fix generators end in `catch -> return []`, so
one bad string would empty an entire tab **with no error anywhere**. Degrading costs one missing link.
`lib/ai/schema.test.ts` pins this, and `category` is deliberately left rejecting beside it — a wrong
category files a fix under the wrong heading, which is a visible claim about what was audited.

**The score bounds deliberately do NOT degrade.** Those catch an analysis that is genuinely wrong (a
page that did not render, a model refusal) and must keep rejecting.

**The hypothesis floor was 5, and removing it is the one place that reasoning was applied in the
wrong spot.** Five was a promise about what a credit buys, enforced by a schema that can only see one
of the three generation calls. All three run in one `Promise.all`; the playbook and the visibility
audit already swallow a failure into an empty list. So a fourth hypothesis coming back short rejected
this object, rejected the whole `Promise.all`, and discarded a finished playbook and a finished audit
with it — tokens already spent, work already done, thrown away over one line.

`generateHypotheses` now degrades the same way its two siblings always have, and what a credit buys is
checked afterwards over everything that came back: **nothing at all** is what refunds, which is what
"paid for a call and got nothing" always meant. See [api.md](api.md) and [report.md](report.md).

**There is no floor at all now, not a floor of one**, and that is the prompt's rule rather than a
concession to it. A page whose lines are doing their job should come back with the ones that are not
and nothing else, and on a page where that set is empty a floor of one buys exactly one invented
finding. It also has to be zero to stay honest downstream: the unmatched-quote check above can empty
the list on its own, after the parse, whatever the schema demanded.

**Only the playbook has a minimum**, and the other two deliberately do not. Every page has room to
convert better, so `PLAYBOOK_MIN` asks for something always available; a page can genuinely have no
discoverability problem left and genuinely have lines that are already working, and a floor there
would buy an invented finding to fill the quota. `FlowPlaybook` renders nothing for an empty list, and
`AnalysisSections` drops a tab whose count is zero, so a short list is a correct answer on both.

## 3. Copy — `systemPrompt`

**It assesses the page's lines and replaces the ones that are not doing their job**, and that framing
is the load-bearing part. The prompt used to open with *"Produce 5-8 high-leverage A/B test
hypotheses"*, ask for *"the single challenger you most recommend testing"*, and have `rationale`
explain *"why the variants should win"* — **written for a stage this product no longer has.** The live
A/B test was removed (see [product.md](product.md)) and the visible strings were cleaned of its
vocabulary; the prompt was not.

A hypothesis generator is *supposed* to emit many cheap candidates, because in a test funnel the
experiment does the judging afterwards. With no experiment, nothing judged: the model was generator
and judge at once and instructed only as a generator. The quota then had to be filled, so on a page
whose lines had already been tightened the last few slots went to rewriting lines that worked.

The prompt now gives it the criterion instead of the quota: a line is doing its job when you can name
what it makes the visitor understand, and failing when you can name what it leaves them to work out.
That is the same test `evidence` already applied to a rewrite, promoted to a gatekeeper. A replacement
that is merely *different* — another angle, another tone, fewer words for their own sake — is not a
finding, and the page that has already been worked on is where that temptation is strongest.

Focus: specificity of claims, CTA strength, social proof quality, value proposition clarity, friction
reduction. Ranked by impact descending, at most `HYPOTHESES_MAX`, each with **one** evidence-bearing
variant. **No minimum** — see the schema notes above and `assessment`.

**Every finding is a single-element text swap.** The prompt used to route structural ideas into a
hypothesis whose rationale began `"Manual change:"`; that convention is gone. Structural ideas are
flow fixes now, and `systemPrompt` explicitly instructs the model to drop such an idea rather than
smuggling it in. **Do not reintroduce a structural escape hatch.**

### Only one variant is generated during the analysis

Generation is output-token-bound, and three variants across a full list meant writing up to 24
copy + evidence pairs while the analysis screen shows only `variants[0]`. The alternates are written
on demand when someone opens the run-a-test screen, which keeps them off the critical path.

**`alternateVariantsPrompt` keeps its fixed quota of two, on purpose.** The no-padding rule above does
not apply to it and must not be extended there for symmetry: the reader has already accepted that
hypothesis and clicked asking for other angles on it, so two is what was asked for rather than a list
being filled out.

`variantCopyRules(language)` in `lib/ai/prompt.ts` is shared by both prompts so an alternate obeys
exactly the same copy rules as the recommendation. `writingRules(language)` sits one level below,
holding the output-language and typography rules that `variantCopyRules` and `playbookPrompt` both
compose, so those can never drift between the things one analysis produces.

### Copy length is a measured per-element ceiling, not prose guidance

`variantWordBudget(words)` in `lib/text.ts` is
`max(words + VARIANT_WORD_BUDGET_FLOOR, ceil(words * VARIANT_WORD_BUDGET_RATIO))`, and every line of
the "Page elements" list carries its own ceiling: `<tag> "text" (max N words, max M characters)`.

### The model chooses the emphasis for the line it wrote, never the line it replaced

`captureElements` flattens `textContent`, so `<h1>Ship <strong>faster</strong> today</h1>` reaches the
prompt as `Ship faster today`, and `copy` comes back as plain text — the swap writes into text nodes and
never sets `innerHTML`, for the fail-safe reason in
[scraping.md](scraping.md#applying-a-variant-to-the-live-dom--applyvariantcopy), so no markup a model
emitted could survive anyway. The prompts forbid markdown and tags outright rather than leave it to
chance.

Which words land in the `<strong>` used to be decided by the proportional split alone, which sooner or
later bolds *the*. So a variant carries `emphasis`: a substring **of its own `copy`**, and the split
places exactly those words in the styled fragment.

**The direction matters and is the whole design.** Asking the model to keep the *original* emphasized
word would constrain the rewrite — and rewriting is the product. Instead it writes freely and then
picks what deserves emphasis in the result, which is a copywriting decision rather than a preservation
constraint. Elements carrying a styled fragment are marked `styled fragment` in the "Page elements"
list so the field is only spent where it can be honoured; everywhere else it is `null`.

`generateAlternateVariants` never sees that list, so the route infers it from the recommendation having
chosen an emphasis at all. `emphasis` is stored on `variants` and read by the variant preview, which
treats an emphasis matching nothing exactly like an absent one.

**The character ceiling is measured, the word ceiling is derived.** `M` is `PageElement.capacity`,
counted off the live page by `captureElements` — see
[scraping.md](scraping.md#how-much-copy-an-element-can-hold) — because words are a poor proxy for
what a box holds: six long words overflow a button that fits nine short ones, and the failure the
reader sees is CSS, not prose. `generateAlternateVariants` never sees the element list, so it falls
back to `variantCharBudget(currentCopy)`, the same ratio applied to characters.

The prompt used to only say "match the element's length", with one qualitative rule that constrained
labels and CTAs and said nothing about a headline — which is how a six word hero title came back as a
50 word paragraph. The alternates call never sees the element list, so `generateAlternateVariants`
computes the ceiling from `currentCopy` with the same function.

**This is deliberately not `TARGET_MATCH_MAX_WORD_RATIO`.** That one guards a matching heuristic, where
being wrong means previewing the wrong element, so it stays tight; a writing budget has to leave room
for a genuinely better line. The floor exists because a pure ratio is nonsense at the short end: a
2-word CTA at 1.5x is 3 words, which forbids "Start free, no card required".

**The overshoot guard `warnOverLength` is log-only, by design.** A `.max()` on `copy` would fail the
whole 16k-token `generateObject` with no retry wrapper, turning one long headline into an opaque `500`
that costs the user the entire analysis; truncating would ship a headline cut mid-clause to a prospect
on the public report; and regenerating puts a second Sonnet call on the critical path for a soft rule.
Logging makes the ceiling's effectiveness measurable, which has to come before escalating it. The
fixtures in `lib/ai/fixtures.ts` all fit their own ceilings, so they stay a correct reference rendering
of the rule.

## 4. Playbook — `generatePlaybook`

A second `generateObject` over `PlaybookOutputSchema`, in `Promise.all` with the hypothesis call, so it
costs no additional latency. Fed the structure JSON and the founder brief. **Resolves to `[]` on any
failure** rather than rejecting, which keeps a playbook failure from taking the analysis down with it.

Load-bearing prompt rules:

- Never recommend adding something the readout says is already there.
- Every `steps` entry is one concrete action on the founder's own site — never advice, never
  replacement copy.
- `evidence` carries no quantitative claim of any kind. See
  [invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured).

`playbookPrompt` is the other half of the core IP and iterates just as carefully as `systemPrompt`.

**The trust signals arrived for free, and that is the point of serializing the whole record.**
`generatePlaybook` passes `JSON.stringify(input.structure)`, so the fields the trust pass added reach
the model the moment they exist on the object — no new prompt input, no second call. What did need
saying is two sentences: that a field *absent* from the readout was not measured rather than absent
from the page, and that the `trust` category argues from what was counted on this page and never from
what people in any country expect. The existing "never recommend adding something the readout says
the page already has" then covers the new fields unchanged.

### `mobile` and `performance` are categories because the readout measured them

The playbook used to receive `PageStructure` alone, and `FLOW_FIX_CATEGORY` had nothing covering a
phone viewport or a load time. The readout counted both, both dragged the score down, and no fix could
ever answer either — **the report told a founder their page was slow and then had nothing to say about
it.** A measurement with no possible answer is a worse deliverable than not measuring.

So `generatePlaybook` now also gets `PageMobile` and `PagePerformance`, and `PLAYBOOK_MAX` went from
6 to 8: the subject got wider, and a ceiling that did not move would have let a phone fix crowd out a
conversion one while the list looked the same length.

The load numbers arrive with the caveat they always carry — measured from a datacentre, a floor a real
visitor never beats — and the prompt forbids presenting one as what a visitor experiences, or saying
what a faster page will produce. Same rule as everywhere else, see [invariants.md](invariants.md).

## 5. Visibility audit — `generateVisibility`

A third `generateObject` in the same `Promise.all`, also resolving to `[]` on any failure. Fed
`PageSeo`, the composed page text, several `PageStructure` fields, the `fetchCrawlerAccess` result
from [scraping.md](scraping.md), and the measured `PageKeywords` terms.

**The page text is a late addition and it fixed a real class of invented finding.** This call had
none of it while its `ai_answerability` category asked whether the page states in plain readable text
what the product is, who it is for and **what it costs** — a judgement about a body the model had
never been given. It filled the gap: run against our own landing page it told us to publish a price
that has been in the served HTML since the packs existed, and to add a cancellation guarantee for a
subscription the product does not sell. Neither was a bad inference from what it had; both were
assertions about a page it could not read.

The keyword block exists so a fix can name **where** to put a term the page already uses. Its prompt
line states the prohibition inline — these are the page's own words, never search volume and never a
ranking opportunity — because the model is being handed a list that looks exactly like the output of a
keyword tool. See
[invariants.md](invariants.md#keywords-measure-the-pages-own-words-never-the-index).

`visibilityPrompt` carries the playbook's evidence discipline plus the rule the whole feature's
credibility rests on — see
[invariants.md](invariants.md#the-audit-measured-the-page-not-the-index).

## 5b. Ad ideas — `generateAdIdeas`

**The only generator that is not in the `Promise.all`, and it must stay out of it.** Everything there
runs on every paid analysis; most owners of a landing page are not buying search traffic for it, so
putting this beside them would add a Sonnet call to every run to serve a minority. It is asked for by
a button on the report instead — `POST /api/analyses/[id]/ads`, owner only — written once, and read
back from `analyses.ad_ideas` afterwards. See [api.md](api.md).

Fed the measured `PageKeywords` terms, the page's title and meta description, its word count and
whether it has an FAQ, plus any founder brief. It returns `AdIdeas` or **null**: empty is a real
answer (a page with nothing to group) and the route has to tell the two apart to decide whether to
write the column.

`adIdeasPrompt` carries `marketRules` and `writingRules` like every other prompt, plus the rule the
whole section rests on, stated three ways because this is **the first surface in the product whose
output looks like the output of a keyword tool**: the terms were counted in the page's own copy, and
there is no search volume, no cost per click, no competition and no ranking potential anywhere,
because we have neither an index nor a clickstream. See
[invariants.md](invariants.md#keywords-measure-the-pages-own-words-never-the-index).

Two more constraints are enforced outside the prompt, because a prompt cannot guarantee either:

- **The character ceilings are Zod's.** `AD_HEADLINE_MAX_CHARS` (30) and
  `AD_DESCRIPTION_MAX_CHARS` (90) are Google's own limits, so a line past one is a line the reader
  cannot upload. It rejects rather than degrades, unlike `finding` — half a set of unusable headlines
  is worse than an empty section with a retry, and the retry costs one call rather than a paid
  analysis.
- **`terms` is intersected with the measured terms on the way back**, by `groundTerms`. A `terms`
  entry is a plain string, so a model that pluralises one, translates one or helpfully adds a synonym
  produces a term this code never counted — and the entire claim the section makes is that these
  words came off the page. A group left with nothing is dropped whole.

The causal prohibition applies here as it does to our own campaigns: a headline may say what the
product does, never what it will produce. See [ads.md](ads.md#what-the-ads-may-say).

## 6. Market

`marketRules(market)` in `lib/ai/prompt.ts` is shared by every prompt that receives a market, because
the risk is identical in all of them and must not be phrased three ways. See
[invariants.md](invariants.md#the-market-is-a-filter-on-what-may-be-recommended-never-a-fact-the-model-knows).

Detection is `lib/market.ts`, measured from the page — see
[invariants.md](invariants.md#the-market-is-measured-from-the-page-never-taken-from-the-ui-locale).

## 7. Output language

`systemPrompt`, `alternateVariantsPrompt` and `playbookPrompt` take a language name
(`AI_OUTPUT_LANGUAGE[locale]`) and instruct the model to write `problem`, `rationale`, `copy` and
`evidence` in it, **as a native speaker would rather than as a word-for-word translation**.

`POST /api/analyses` passes the caller's UI locale and stores it on `analyses.locale`; the alternates
route reads that stored value. See
[invariants.md](invariants.md#generated-content-is-pinned-to-the-locale-it-was-written-in).

The typographic rule restricts **punctuation only** — see
[invariants.md](invariants.md#pt-br-is-a-rewrite-not-a-translation).

## 7b. Voice

`writingRules` says which language and which punctuation. `voiceRules` says how a sentence is built,
and it is a separate fragment for that reason: the two get edited for different reasons, and one
combined block is how an edit to the punctuation rule silently rewrites the style one. Both are
appended together at all four sites, so every prompt that writes prose carries both.

What it forbids is the set of habits that make a sentence read as machine written and that no other
rule here catches: sales language and inflated importance, a participle clause bolted onto a fact to
fake a mechanism, three of something because three sounds finished, "not just X but Y", clipped
negative endings, filler, and a closing line of encouragement. The superlative rule in
`adIdeasPrompt` and the no-invented-number rule in `variantCopyRules` already cover their own ground
and are not repeated.

**`evidence` is the field this exists for.** It asks for a CRO mechanism in one sentence, and a
participle ("ensuring the visitor understands the offer") is the cheapest way to produce something
mechanism-shaped that argues nothing.

The habits are named rather than listed as English words on purpose. Half of these analyses are
written in Portuguese, and a blocklist of English adjectives would leave `aprimorar` and `garantir`
untouched.

Nothing tests this. The effect only shows up in model output, so a change here is checked by running
an analysis in both locales and reading the fields.

## 8. The call

```typescript
const result = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: AnalysisOutputSchema,
    system: systemPrompt(AI_OUTPUT_LANGUAGE[locale]),
    prompt: `Landing page copy:\n\n${cleanedPageContent}${elementsSection}${briefSection}`
})
```
