# AI pipeline

Three `generateObject` calls in one `Promise.all` — hypotheses, playbook, visibility audit — behind a
web-search step. `lib/ai/`.

The prompts are the core IP and iterate carefully. Everything they may **not** say is in
[invariants.md](invariants.md#generation).

## 1. Preprocess

Strip scripts, styles and meta tags; extract semantic text only.

```
H1: ...
Subheadline: ...
CTA button: ...
Feature: ...
Testimonial: ...
Pricing: ...
```

## 2. Competitor research (web search)

Before structured generation, a web-search step with the official Anthropic SDK (`@anthropic-ai/sdk`,
tool `web_search_20250305`) using `competitorResearchPrompt(market)` finds 2-3 real competitor landing
pages and summarizes their positioning into a brief. The brief is passed into `generateObject` so
variants are grounded, and each variant carries an `evidence` line naming the pattern it borrows.

Persisted to `analyses.research_brief` so the on-demand alternates never re-run the search. Degrades
gracefully to an empty brief (no `ANTHROPIC_API_KEY`, or a failure) so generation still succeeds.
Skipped entirely when `E2E_FIXTURES=1`.

**It runs on `RESEARCH_MODEL` (`claude-haiku-4-5`), not the generation model**: it is
search-and-summarize, not strategy. Two constraints come with that choice and must hold — Haiku
rejects the `effort` parameter, and it supports only the basic `web_search_20250305` tool variant (the
`_20260209` dynamic-filtering variant needs Sonnet 4.6 or newer). `max_uses` is `RESEARCH_MAX_SEARCHES`
(3); each use is a serial round trip, so more of them buys latency rather than coverage.

The search tool is given `user_location` from `MARKET_SEARCH_LOCATION[market]`. This was the one place
in the pipeline that ignored where the product sells: without it the search runs from nowhere in
particular, English-language results win, and a Brazilian product is benchmarked against American
companies it never competes with. `user_location` is a parameter of the basic variant, so the Haiku
constraints still hold.

**Paid Competitor mode skips this step.** `analyzeLandingPage` scrapes the supplied URLs concurrently
and concatenates the cleaned copy into the brief instead. A URL that fails to scrape drops out of the
brief rather than failing the batch.

That path also **keeps the `PageStructure` each of those scrapes already returned** — the page was
opened, measured and closed either way, so the comparison table costs nothing. The auto-search path
stores none; see
[invariants.md](invariants.md#a-comparison-exists-only-where-the-competitor-page-was-actually-opened).

A founder `brief`, when present, is appended to the generation prompt so variants use real facts and
come back finished rather than as `[placeholder]` templates.

## 3. Schemas

```typescript
const VariantSchema = z.object({ copy: z.string(), evidence: z.string() })

const HypothesisSchema = z.object({
    section: z.enum(SECTIONS).catch(SECTION_FALLBACK),
    problem: z.string(),
    current_copy: z.string(),
    variants: z.array(VariantSchema).length(1),
    impact_score: z.number().int().min(1).max(10),
    effort_score: z.number().int().min(1).max(10),
    rationale: z.string()
})

const AnalysisOutputSchema = z.object({
    competitors: z.array(z.object({ name: z.string(), url: z.string() })).max(4),
    hypotheses: z.array(HypothesisSchema).min(5).max(8)
})

const AlternateVariantsSchema = z.object({ variants: z.array(VariantSchema).length(2) })
```

**A hypothesis `effort_score` is generated, stored, and never shown.** It stays in the schema only
because the column is `notNull`; the UI dropped it because every copy hypothesis is a single-element
swap the snippet applies, so there is no cost to vary and the copy prompt never defined the field. A
flow fix keeps its `effort_score` on screen, where the prompt does define it and the cost is real. See
[analysis-ui.md](analysis-ui.md#why-a-copy-hypothesis-shows-impact-but-no-effort).

```typescript

const FlowFixSchema = z.object({
    category: z.enum(FLOW_CATEGORY),
    title: z.string(),
    problem: z.string(),
    steps: z.array(z.string()).min(2).max(PLAYBOOK_STEPS_MAX),
    impact_score: z.number().int().min(1).max(10),
    effort_score: z.number().int().min(1).max(10),
    evidence: z.string()
})

const PlaybookOutputSchema = z.object({
    fixes: z.array(FlowFixSchema).min(PLAYBOOK_MIN).max(PLAYBOOK_MAX)
})

const VisibilityFixSchema = z.object({ category: z.enum(VISIBILITY_FIX_CATEGORY), ...fixFields })
const VisibilityOutputSchema = z.object({ fixes: z.array(VisibilityFixSchema).max(VISIBILITY_MAX) })
```

**`section` is the one field that degrades instead of rejecting.** It only picks a badge colour, so an
unrecognized value costs one mislabelled pill, while rejecting it throws away every other hypothesis
plus the generation call already paid for. `.catch` does not strip the enum from the JSON schema, so
the model is still told the exact allowed values — and it covers a missing or null value too, which is
why the parsed type stays a plain `Section`.

The failure it exists for was caused by the prompt: the element list used to format each line as
`(h2) "text"`, and the model read that tag as the section label and returned `section: 'h2'`. The list
now uses `<tag> "text"` and `systemPrompt` says outright that an HTML tag is not a section value — but
a schema that survives the next such slip is the actual guarantee.

**The score bounds and `.min(5).max(8)` deliberately do NOT degrade.** Those catch an analysis that is
genuinely wrong (a page that did not render, a model refusal) and must keep rejecting.

**The visibility audit has no minimum**, unlike the playbook. Every page has room to convert better, so
`PLAYBOOK_MIN` asks for something always available; a page can genuinely have no discoverability
problem left, and a floor would buy an invented finding to fill the quota. `FlowPlaybook` renders
nothing for an empty list, so `[]` is a correct answer.

## 4. Hypotheses — `systemPrompt`

Focus: grounding every hypothesis and variant in the competitor brief, specificity of claims, CTA
strength, social proof quality, value proposition clarity, friction reduction. Return 5-8 hypotheses
ranked by impact descending, each with **one** evidence-bearing variant — the single challenger it
most recommends testing.

**Every hypothesis is a single-element text swap.** The prompt used to route structural ideas into a
hypothesis whose rationale began `"Manual change:"`; that convention is gone. Structural ideas are
flow fixes now, and `systemPrompt` explicitly instructs the model to drop such an idea and spend the
slot on a copy change rather than smuggling it in. **Do not reintroduce a structural escape hatch.**

### Only one variant is generated during the analysis

Generation is output-token-bound, and three variants across 5-8 hypotheses meant writing up to 24
copy + evidence pairs while the analysis screen shows only `variants[0]`. The alternates are written
on demand when someone opens the run-a-test screen, which keeps them off the critical path.

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
chosen an emphasis at all. `emphasis` is stored on `variants`, snapshotted onto
`experiments.variant_emphasis` at launch, and served to the snippet — an operator who edits the copy in
the test runner can leave it matching nothing, which the swap treats exactly like absent.

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

## 5. Playbook — `generatePlaybook`

A second `generateObject` over `PlaybookOutputSchema`, in `Promise.all` with the hypothesis call, so it
costs no additional latency. Fed the structure JSON and the founder brief. **Resolves to `[]` on any
failure** rather than rejecting, which keeps a playbook failure from taking the analysis down with it.

Load-bearing prompt rules:

- Never recommend adding something the readout says is already there.
- Every `steps` entry is one concrete action on the founder's own site — never advice, never
  replacement copy.
- `evidence` carries no quantitative claim of any kind. See
  [invariants.md](invariants.md#a-generated-evidence-never-carries-a-number).

`playbookPrompt` is the other half of the core IP and iterates just as carefully as `systemPrompt`.

## 6. Visibility audit — `generateVisibility`

A third `generateObject` in the same `Promise.all`, also resolving to `[]` on any failure. Fed
`PageSeo`, two `PageStructure` fields, the `fetchCrawlerAccess` result from
[scraping.md](scraping.md), and the measured `PageKeywords` terms.

The keyword block exists so a fix can name **where** to put a term the page already uses. Its prompt
line states the prohibition inline — these are the page's own words, never search volume and never a
ranking opportunity — because the model is being handed a list that looks exactly like the output of a
keyword tool. See
[invariants.md](invariants.md#keywords-measure-the-pages-own-words-never-the-index).

`visibilityPrompt` carries the playbook's evidence discipline plus the rule the whole feature's
credibility rests on — see
[invariants.md](invariants.md#the-audit-measured-the-page-not-the-index).

## 7. Market

`marketRules(market)` in `lib/ai/prompt.ts` is shared by every prompt that receives a market, because
the risk is identical in all of them and must not be phrased three ways. See
[invariants.md](invariants.md#the-market-is-a-filter-on-what-may-be-recommended-never-a-fact-the-model-knows).

Detection is `lib/market.ts`, measured from the page — see
[invariants.md](invariants.md#the-market-is-measured-from-the-page-never-taken-from-the-ui-locale).

## 8. Output language

`systemPrompt`, `alternateVariantsPrompt` and `playbookPrompt` take a language name
(`AI_OUTPUT_LANGUAGE[locale]`) and instruct the model to write `problem`, `rationale`, `copy` and
`evidence` in it, **as a native speaker would rather than as a word-for-word translation**.

`POST /api/analyses` passes the caller's UI locale and stores it on `analyses.locale`; the alternates
route reads that stored value. See
[invariants.md](invariants.md#generated-content-is-pinned-to-the-locale-it-was-written-in).

The typographic rule restricts **punctuation only** — see
[invariants.md](invariants.md#pt-br-is-a-rewrite-not-a-translation). The competitor research brief
stays in whatever language the search returns; generation translates its substance into the target
language.

## 9. The call

```typescript
const result = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: AnalysisOutputSchema,
    system: systemPrompt(AI_OUTPUT_LANGUAGE[locale]),
    prompt: `Landing page copy:\n\n${cleanedPageContent}\n\nCompetitive research brief:\n\n${brief}`
})
```
