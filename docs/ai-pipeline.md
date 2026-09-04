# AI pipeline

Three `generateObject` calls in one `Promise.all`, hypotheses, playbook, visibility audit, then a
fourth over the rewrites alone, which may only remove them. `lib/ai/`.

**There is no web-search step, and there never will be one.** A search call before generation is
roughly half the cost of an analysis, because search is agentic and each of its three rounds resends
the conversation plus the content of the results: about $0.17 a run against about $0.09 without it.
Cost is not the reason it stays out. What it produces is a model's recollection of what competitors
do, presented beside numbers this code counted, and the two are indistinguishable to a reader.

**Comparison against a competitor exists again, and it is the inverse of that.** The reader supplies
a URL, `measureCompetitor` scrapes it, and `lib/readout.ts` counts the same facts off it, so the
prompts still argue only from pages this code measured, and now there can be two of them. Nothing
infers a competitor and nothing searches for one: no URL, no comparison. See
[invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured).

The prompts are the core IP and iterate carefully. Everything they may **not** say is in
[invariants.md](invariants.md#generation).

## 1. Preprocess

Strip scripts, styles and meta tags; extract semantic text only.

### The text budget is stated, and truncation is declared

`preprocessHtml` does not truncate, and a `.slice` inside it is the failure to avoid. No caller would
know and no doc would say so, and the effect is that every prompt in the product receives the top
third of a long page and is told nothing about the rest. That is not a size limit but an
undeclared blind spot: a model handed the first third of a page reports that the pricing is missing,
that there is no FAQ, that nothing says what the product costs, which is
[unknown reported as negative](invariants.md#unknown-is-never-reported-as-negative) committed by a
`slice`.

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
  everything fit, a note that appears every time is a note nobody reads.

The counts that back this up are measured over the **whole** page and travel beside the text, so
`hasPricing` and `hasFaq` settle the question even for a section the budget could not carry.

### `evidenceRules` is shared by all three prompts

Beside `marketRules` and `competitorRules` in `lib/ai/prompt.ts`, and for the same reason: the risk
is identical wherever page content reaches a model and three wordings of it would drift. It carries
two halves that fail differently, what may be concluded from missing text, and the ban on inventing
how the product is sold. The second is not implied by the first, and it is the one that produced a
recommendation to add a cancellation guarantee to a product with no subscription.

### Elements are chosen by what they are, not where they sit

`captureElements` returns in document order, so the old `.slice(0, MAX_PROMPT_ELEMENTS)` kept the top
of the page. On a long page the closing call to action was element four hundred and no variant could
ever be written for it. `promptElements` in `lib/prompt-elements.ts` admits every heading and every
`a`/`button` first, fills the rest with body copy, and **sorts back into document order.** Priority
decides what survives, never what order the model reads.

```
H1: ...
Subheadline: ...
CTA button: ...
Feature: ...
Testimonial: ...
Pricing: ...
```

An owner `brief`, when present, is appended to the generation prompt so variants use real facts.

**It is what a credit is spent on, and that came out of a measurement rather than a preference.**
`analyses.brief` was null in every real analysis this product had ever run, so half of
`variantCopyRules` had never executed once. Scraping one page and generating from that single
measurement twice with a brief and twice without put the two arms side by side:

| | no brief | with brief |
| --- | --- | --- |
| rewrites saying a word only the brief carried | 0% | 55% |
| mean word reuse from the line being replaced | 41% | 52% |
| uses a `[placeholder]` | 0% | 0% |

The arm with no brief reshuffles the page's own vocabulary, because that vocabulary is the only thing
in front of it. The arm with one opens on the objection the owner named and puts facts in the copy
that the page did not carry.

Two things in that table are worth keeping for the next person who changes this prompt. **Word reuse
is not a measure of specificity and reads backwards**: using a brief fact means keeping the product's
nouns and adding the differentiator, so the better arm reuses *more*. And **the "write a template with
[placeholders]" mode described by `variantCopyRules` does not exist in practice** -- it is 0% in the
arm that is supposed to produce it. Without facts the model does not ask for them, it goes vague,
which is the failure no rule in the prompt forbids.

### A second round is not a second draw

The alternates call receives **every line already written for that element**, and the prompt says
those were seen and not used, so repeating one is a wasted slot. Handed the recommended line alone,
asking again is a fresh sample from the same distribution and round three can hand back round one.

A reader can also point a round in a direction: `VARIANT_TONE` is a closed list, and
`VARIANT_TONE_INSTRUCTION` in `lib/constants.ts` is what the prompt actually reads. **Every entry
constrains form and none of them states a fact**, which is the whole reason it is an enum. A free
text field would let "say we are the best in Brazil" arrive as an instruction, and the only defence
would be a written rule, which is what has held nothing here.

**Rounds are capped and counted over the model's own rows.** `roundsLeft` in `lib/variant-rounds.ts`
is called by the route and by the card, so the button the reader sees and the answer the route gives
cannot drift. Writing your own line costs no round: that is not asking the model for another one, and
charging for it would penalise the thing most worth encouraging.

### The second pass can only take rewrites away

The copy call assesses a line, decides it is failing, writes the replacement, scores its own work and
justifies it, all in one response. Those jobs conflict: a model that has just written a replacement is
the worst available judge of whether it was needed. It is not a theoretical conflict -- one response
carried an `assessment` saying the CTA removed the cost objection and a variant that deleted the word
"free".

So judging is a separate call. `critiquePrompt` receives the page and the numbered rewrites and
answers with `CritiqueSchema`, which has exactly one field: the indexes to drop, with a reason.

**The limit lives in the schema, not in the prompt.** There is no field for a replacement, no field
for a score, no field for a new finding, so a critic that decides it could write a better line has
nowhere to put it. That matters because prompt instruction has repeatedly failed to hold behaviour in
this pipeline while code reading output has held it every time. It is the same shape as
`resolveTargets`: the prompt asks, and the check happens on the way back.

Four things follow:

- **Silence is agreement.** `applyCritique` keeps anything the critic does not name, so a truncated or
  partial answer costs nothing and only an explicit drop removes anything.
- **It fails open.** The rewrites have already been paid for and already cost their tokens; an extra
  call that times out must not take a finished set down with it. Same reasoning as the schema floor.
- **It may empty the list.** An analysis with no copy findings already renders, and the refund only
  fires when all three generations came back with nothing.
- **The reasons are never shown to anybody.** They exist so the log tells a person comparing two
  versions of this prompt what the critic thought it was doing.

**What it is judged by is the acceptance rate, and that data does not exist yet.** Until it does, the
only established fact about this pass is that it makes the list shorter. `e2e/critiqued-copy.spec.ts`
walks the drop against a fixed verdict, so what is faked there is the critic's answer and never the
code acting on it.

### The reader's other pages are read, when they exist

The brief works because it puts facts in front of the model that the landing page does not carry.
`measureNeighbours` in `lib/analyze.ts` goes after the same thing without asking anybody: the page's
own same-origin links are captured during the scrape (`captureLinks`), `pickNeighbours` in
`lib/site-pages.ts` recognises at most `SITE_PAGE_MAX` of them as pricing, docs, features, about or
faq, and each one is opened for its text alone.

Three rules hold it together, and each fails differently if it is undone:

- **It selects, it never crawls.** A link matching no pattern is never opened, and nothing follows a
  link found on a page it opened. An analysis visits a bounded number of recognised kinds of page.
- **Nothing from these pages reaches the readout or the score.** They are material for the copy
  prompt, exactly as a competitor's readout is. A number off a pricing page rendered in the readout
  would be presented as a fact about the page the reader pasted.
- **Only the owned branch opens them**, because `measureNeighbours` is called from
  `generateFromMeasurement` and never from `measurePage`. An ownerless run costs one browser slot and
  zero tokens; opening two more pages to gather material for a generation that will not happen spends
  slots on nothing. See [invariants.md](invariants.md).

They go to the copy call and to neither of the other two. The playbook argues from what was counted
and the visibility audit from the SEO readout; neither writes a sentence an owner publishes, which is
the one thing this material exists to make specific.

**On the evidence so far it fires rarely, and the reason is worth writing down.** Of the two real
sites available, `hunch.solutions` picks nothing and `notes.axtenn.com` picks one page. A one-page
landing site keeps its pricing and its features behind `#anchors` on the page that was already
measured, and `captureLinks` drops fragments because opening them would re-read the same document.
So the pages this looks for exist on multi-page sites and are frequently absent from exactly the kind
of page this product is sold for. The mechanism is right and its reach is narrower than the argument
for it assumed; that is a fact about landing pages, not a bug to tune the patterns around.

`scripts/brief-ab.mts` is the run, and `POST /api/analyses` is where the consequence lives: without
all four answers no credit is taken. See [analysis-ui.md](analysis-ui.md) for why that is charged at
the credit and never at the submit.

**It is still one free text column, and the form now asks four questions into it.** `analyses.brief`
was a blank textarea, which asked the reader to guess what was useful, and most of them wrote nothing.
`composeBrief` in `lib/brief.ts` folds the four `BRIEF_FIELD` answers into one labelled string
(`Audience: ...`, `Offer: ...`, `Action: ...`, `Objection: ...`) and `parseBrief` reads it back for
the form. Nothing downstream changed: the prompts still receive prose.

The labels are written in English at every locale, deliberately. They are read by the model and never
by the reader, so translating them would make the same brief parse differently depending on which
language the analysis happened to run in. `parseBrief` also has to stay forgiving, every brief
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
then write the replacement.** `problem` first has the model naming a defect before it has
transcribed the line the defect was in.

Nothing at runtime complains if someone sorts these alphabetically, and the analysis would go back to
arguing before it had looked. `lib/ai/schema.test.ts` asserts the order for that reason, and it is the
only thing that would catch the change.

### A quoted line is checked against the page, and an unmatched one drops the card

`current_copy` must be the verbatim text of one element from the list the prompt was handed. The
prompt says so, Zod sees a plain string, and the card renders that quote **struck through as what the
page says today.** So a paraphrase, or two elements merged, is generated text presented as a
measurement, which [invariants.md](invariants.md) forbids.

`resolveTargets` in `lib/analyze.ts` therefore drops any hypothesis whose quote matches no element,
with a `console.warn` naming it, for the reason every check of this shape exists here: the prompt
asks and cannot guarantee, so the guarantee is made on the way back, in code. The cost is real, a usable rewrite is lost to a transcription slip, and the
alternative is telling somebody their page says something it does not.

**`found` and `mode` answer different questions and are allowed to disagree.**
`resolveTarget` in `lib/prompt-elements.ts` decides `found` by containment: a quote that is a
substring of an element, or contains one, is on the page. Only then does `TARGET_MATCH_MAX_WORD_RATIO`
decide whether the two are close enough in length to point a selector at, and failing that gives
`manual`. Deciding both with the ratio would call a four-word quote of a six-word heading "not on this
page", and now that a missing quote deletes the card it would delete a real one.

So `manual` means one thing, that we cannot point at it, and it covers a line the page says twice,
an ambiguous near match, and a fragment too short to swap. It does not cover a line that is not
there.

It lives in `lib/prompt-elements.ts` beside `promptElements` because the two are one round trip: the
element list leaves through one and comes back through the other. Both import from `lib/scrape.ts`
**type-only**, for the reason `lib/competitor.ts` documents, a value import pulls puppeteer in, and
that is also what makes these testable.

### A replacement made only of the words it replaces is dropped

Second condition in the same place, and the same reasoning: the prompt asks, code checks on the way
back. **A text whose words are all already in the line it replaces proposes no idea by construction**,
whatever order they are in, so there is no page and no reader for whom it could be an improvement.

It is not a hypothetical. Two of the 32 real rewrites stored during development were exactly this,
both ranked and shown with an impact score beside them:

```
notes.axtenn.com [hero_image]
was: 🔒 Criptografia em trânsito e repouso 🔑 Seus dados são só seus ⚖️ Em conformidade com a LGPD
now: ⚖️ Em conformidade com a LGPD 🔒 Criptografia em trânsito e repouso 🔑 Seus dados são só seus

hunch.solutions [other]
was: Sem cadastro, sem cartão, sem instalar nada. Só a sua URL.
now: Só a sua URL. Sem cadastro, sem cartão, sem instalar nada.
```

**The threshold is zero new words and must not be loosened without evidence.** A quarter of real
rewrites reuse 70% or more of the original and nearly all of them are legitimate, a rewrite keeps the
product's own nouns. A ratio here would delete finished work on a number nothing supports;
`scripts/rewrite-stats.mts` is what would earn a tighter one.

### Measuring the generator instead of reviewing the copy

`lib/rewrite-stats.ts` scores a replacement against the line it replaces, and
`scripts/rewrite-stats.mts` runs it over every stored analysis. **It exists because every judgement
about this generator until then was taste**, "that rewrite is worse" is a claim about somebody's
landing page, and on that the page's owner is right and we are not, so it cannot decide whether a
prompt change helped.

The baseline, 32 real rewrites over two domains, before any of this was changed:

| property | rate |
| --- | --- |
| reuses 70% or more of the original's words | 25% |
| **permutation: zero new words** | **6%** |
| over the word ceiling | 22% |
| `rationale` claims a general truth | 13% |
| uses a `[placeholder]` | 3% |

Three things to read carefully before trusting a comparison against it:

- **Only `permutation` is a defect.** The others are rates that move; high reuse is the normal case.
- **The script drops fixture runs**, matching `current_copy` against `fixtureAnalysis`. Three of the
  five analyses in a development database are fixture runs and would describe the fixtures.
- **A single run is noisy.** Across three runs of the same page, "reuse >= 70%" swung from 13% to 38%.
  Compare aggregates, and treat a small movement as nothing.

The 3% placeholder rate is itself a finding. `variantCopyRules` says that without a brief a variant
should read as a usable template, and the model almost never writes one: it found a third way out,
which is to stay abstract. Nothing forbids vagueness, so vagueness is where an honest generator goes
when it may not invent and is not asked for the missing fact. **Every analysis ever run took that
branch**, `analyses.brief` is null in all of them.

### `assessment` is the half of the comparison that was never asked for

The prompt defined `problem` as one sentence naming the gap, and **nothing anywhere invited the model
to say what the current line gets right.** A brief asking only for faults produces only faults: a line
already doing its job had no way to survive the pass, so every element that got looked at came back
rewritten. That is how an owner who had just followed this product's own advice was told to undo it.

It is a field rather than an instruction because a judgement that is not written down cannot be
checked, by the reader or by us. `assessmentRules()` states the outcome it exists to make possible:
**if the verdict is that the line is doing its job, there is no finding and the element is dropped.**

It renders in the "why" drawer above `rationale`, labelled, for the reason `evidence` is labelled
see [components.md](components.md). The column is nullable: rows written before the field existed have
none, and null renders as no verdict rather than as a label over nothing.

**No prompt asks for an effort score**, and neither schema nor column carries one, because a model
that has read one page cannot know what applying a change costs on someone else's stack. See
[analysis-ui.md](analysis-ui.md#nothing-shows-an-effort-score-anywhere). Ranking is `impact_score`
alone.

### `rationale` argues from this page, never from what generally works

Asking for a rationale *"grounded in CRO principles and in what this page shows"* sits one field over
from an `evidence` forbidden to say *"studies show"* or name a benchmark. **Two adjacent fields, two
opposite standards, and the loose one is where the worst changes get justified**: a rewrite that
deletes a free-of-charge signal from a CTA argues that "CTAs naming the outcome convert better than
CTAs naming the price", which nobody here has measured. The identical claim turned up in two separate
runs, so it is a reflex rather than a stray sentence: 13% of rationales carry one.

The claim is forbidden by name in the same field, and the rule points at `evidence` as the standard
it is held to.

**This is a prompt change, and prompt changes have a poor record here.** The same generation that
wrote that the CTA "remove a objeção de custo" deleted the word anyway, in the same response. So it is
an experiment rather than a fix, and `scripts/rewrite-stats.mts` is what says whether it held.

It is also the cheap precondition for a much larger question. If output degrades without the
folklore, the folklore was carrying weight and citing real sources would be worth building; if the
rate falls and nothing else moves, it was only producing bad justifications.

### `impactScoreRules()` says what the number measures

`impact_score is an integer from 1 to 10` is a range and not a meaning, and it is what the three
prompts would otherwise each repeat. With no definition the number drifts to the **importance of
the thing being changed**, so an h1 scores high for being an h1 and a debatable rewrite of the hero
outranks a small correction that is certainly right. An 8 beside a replacement its own author would
not ship is that drift, not a miscalculation.

The shared helper says it is the gain from making *this* change, that a marginal improvement scores
low wherever it sits, and, the clause that ties it to the ceilings, that an item scoring low because
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
one page. The readout counts 43 things above the tabs and the fix lists carry up to 20 cards below.
Without it, nothing ties one to the other and the reader makes the join by recognising the words:
"form has 7 fields" up here, "cut the form to three" down there.

The generator always had the numbers. `findingsSection` in `lib/analyze.ts` now also hands it the
**ids and severities**, narrowed to the groups that generator can act on, and `readoutRules` in
`lib/ai/prompt.ts`, shared by both prompts for the same reason `marketRules` is, carries three
rules: name the one finding the fix answers, never attach one to a finding whose severity is `ok`,
and do not restate the measurement in `problem`. That last one is what kills the duplication: eleven
of the fifteen `declared` and `crawler_access` findings had a fix category covering the same subject,
and the fix's own sentence would repeat the tile the reader had just read.

**`null` is a correct and common answer.** Nothing measures whether an action is repeated below the
pricing table, so a fix about that names no finding.

**It costs input tokens and not output ones.** `maxTokens` caps the completion, so serializing the
findings in grows the prompt, never the budget the answer has to fit inside; the only growth on the
output side is one short id per fix.

**`section` is not the only field that degrades any more, `finding` does too, for the same reason.**

**`section` is the one field that degrades instead of rejecting.** It only picks a badge colour, so an
unrecognized value costs one mislabelled pill, while rejecting it throws away every other hypothesis
plus the generation call already paid for. `.catch` does not strip the enum from the JSON schema, so
the model is still told the exact allowed values, and it covers a missing or null value too, which is
why the parsed type stays a plain `Section`.

The failure it exists for comes from the prompt. Formatting each line of the element list as
`(h2) "text"` has the model read that tag as the section label and return `section: 'h2'`. The list
uses `<tag> "text"` and `systemPrompt` says outright that an HTML tag is not a section value, but a
schema that survives the next such slip is the actual guarantee.

`finding` uses `.catch(null)` on exactly that reasoning, and the stakes are higher: a hallucinated id
would reject the whole `generateObject` call, and both fix generators end in `catch -> return []`, so
one bad string would empty an entire tab **with no error anywhere**. Degrading costs one missing link.
`lib/ai/schema.test.ts` pins this, and `category` is deliberately left rejecting beside it, a wrong
category files a fix under the wrong heading, which is a visible claim about what was audited.

**The score bounds deliberately do NOT degrade.** Those catch an analysis that is genuinely wrong (a
page that did not render, a model refusal) and must keep rejecting.

**The hypothesis floor was 5, and removing it is the one place that reasoning was applied in the
wrong spot.** Five was a promise about what a credit buys, enforced by a schema that can only see one
of the three generation calls. All three run in one `Promise.all`; the playbook and the visibility
audit already swallow a failure into an empty list. So a fourth hypothesis coming back short rejected
this object, rejected the whole `Promise.all`, and discarded a finished playbook and a finished audit
with it, tokens already spent, work already done, thrown away over one line.

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

## 3. Copy: `systemPrompt`

**It assesses the page's lines and replaces the ones that are not doing their job**, and that framing
is the load-bearing part. **The experiment vocabulary is the thing to keep out of it.** Opening with
*"Produce 5-8 high-leverage A/B test hypotheses"*, asking for *"the single challenger you most
recommend testing"*, or having `rationale` explain *"why the variants should win"* writes the prompt
for a stage this product does not have. See [product.md](product.md).

A hypothesis generator is *supposed* to emit many cheap candidates, because in a test funnel the
experiment does the judging afterwards. With no experiment, nothing judges: the model is generator
and judge at once, and instructed only as a generator it fills the quota, so on a page whose lines
have already been tightened the last few slots go to rewriting lines that work.

The prompt gives it the criterion instead of the quota: a line is doing its job when you can name
what it makes the visitor understand, and failing when you can name what it leaves them to work out.
That is the same test `evidence` already applied to a rewrite, promoted to a gatekeeper. A replacement
that is merely *different*, another angle, another tone, fewer words for their own sake, is not a
finding, and the page that has already been worked on is where that temptation is strongest.

Focus: specificity of claims, CTA strength, social proof quality, value proposition clarity, friction
reduction. Ranked by impact descending, at most `HYPOTHESES_MAX`, each with **one** evidence-bearing
variant. **No minimum.** See the schema notes above and `assessment`.

**Every finding is a single-element text swap.** Structural ideas are flow fixes, and `systemPrompt`
explicitly instructs the model to drop such an idea rather than smuggling it into a hypothesis whose
rationale begins `"Manual change:"`. **Do not add a structural escape hatch.**

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

**Neither ceiling is enforced, and the measured one is only now being counted.** `warnOverLength` logs
and returns; nothing rejects. Two reasons to leave it that way for now: 22% of real rewrites pass the
word ceiling and the single best rewrite observed was one of them, so rejecting would throw away the
good with the long. And the number that matters has never been counted at all, `capacity` is not
stored, so no stored row can be scored for it after the fact and `scripts/rewrite-stats.mts` can only
report the derived ceiling.

So `resolveTarget` now returns the matched element's `capacity` and `warnOverLength` reports both,
separately (`overBudget`, `overBox`). **No rule is written until the measured overflow has a rate.**
An unpointable match has no box, so the alternates path and any `manual` target fall back to the
derived ceiling alone rather than borrowing a number from another element.

### The model chooses the emphasis for the line it wrote, never the line it replaced

`captureElements` flattens `textContent`, so `<h1>Ship <strong>faster</strong> today</h1>` reaches the
prompt as `Ship faster today`, and `copy` comes back as plain text, the swap writes into text nodes and
never sets `innerHTML`, for the fail-safe reason in
[scraping.md](scraping.md#applying-a-variant-to-the-live-dom--applyvariantcopy), so no markup a model
emitted could survive anyway. The prompts forbid markdown and tags outright rather than leave it to
chance.

Which words land in the `<strong>` cannot be left to the proportional split alone, which sooner or
later bolds *the*. So a variant carries `emphasis`: a substring **of its own `copy`**, and the split
places exactly those words in the styled fragment.

**The direction matters and is the whole design.** Asking the model to keep the *original* emphasized
word would constrain the rewrite, and rewriting is the product. Instead it writes freely and then
picks what deserves emphasis in the result, which is a copywriting decision rather than a preservation
constraint. Elements carrying a styled fragment are marked `styled fragment` in the "Page elements"
list so the field is only spent where it can be honoured; everywhere else it is `null`.

`generateAlternateVariants` never sees that list, so the route infers it from the recommendation having
chosen an emphasis at all. `emphasis` is stored on `variants` and read by the variant preview, which
treats an emphasis matching nothing exactly like an absent one.

**The character ceiling is measured, the word ceiling is derived.** `M` is `PageElement.capacity`,
counted off the live page by `captureElements`, see
[scraping.md](scraping.md#how-much-copy-an-element-can-hold), because words are a poor proxy for
what a box holds: six long words overflow a button that fits nine short ones, and the failure the
reader sees is CSS, not prose. `generateAlternateVariants` never sees the element list, so it falls
back to `variantCharBudget(currentCopy)`, the same ratio applied to characters.

"Match the element's length" is not enough on its own: a qualitative rule that constrains labels and
CTAs and says nothing about a headline is how a six word hero title comes back as a 50 word
paragraph. The alternates call never sees the element list, so `generateAlternateVariants` computes
the ceiling from `currentCopy` with the same function.

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

## 4. Playbook: `generatePlaybook`

A second `generateObject` over `PlaybookOutputSchema`, in `Promise.all` with the hypothesis call, so it
costs no additional latency. Fed the structure JSON and the owner brief. **Resolves to `[]` on any
failure** rather than rejecting, which keeps a playbook failure from taking the analysis down with it.

Load-bearing prompt rules:

- Never recommend adding something the readout says is already there.
- Every `steps` entry is one concrete action on the owner's own site, never advice, never
  replacement copy.
- `evidence` carries no quantitative claim of any kind. See
  [invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured).

`playbookPrompt` is the other half of the core IP and iterates just as carefully as `systemPrompt`.

**The trust signals arrived for free, and that is the point of serializing the whole record.**
`generatePlaybook` passes `JSON.stringify(input.structure)`, so the fields the trust pass added reach
the model the moment they exist on the object, no new prompt input, no second call. What did need
saying is two sentences: that a field *absent* from the readout was not measured rather than absent
from the page, and that the `trust` category argues from what was counted on this page and never from
what people in any country expect. The existing "never recommend adding something the readout says
the page already has" then covers the new fields unchanged.

### `mobile` and `performance` are categories because the readout measured them

The readout counts a phone viewport and a load time, and both drag the score down. Handed
`PageStructure` alone, with no `FLOW_FIX_CATEGORY` covering either, no fix can ever answer them:
**the report tells an owner their page is slow and then has nothing to say about it.** A measurement
with no possible answer is a worse deliverable than not measuring.

So `generatePlaybook` also gets `PageMobile` and `PagePerformance`, and `PLAYBOOK_MAX` is 8 rather
than 6: the subject is wider, and a ceiling that did not move with it would let a phone fix crowd out
a conversion one while the list looked the same length.

The load numbers arrive with the caveat they always carry, measured from a datacentre, a floor a real
visitor never beats, and the prompt forbids presenting one as what a visitor experiences, or saying
what a faster page will produce. Same rule as everywhere else, see [invariants.md](invariants.md).

### The sameness marks reach it as context, never as findings

`PlaybookInput.sameness` carries the ten counts from the `sameness` readout group, and they are
serialised into the prompt on their own key rather than travelling in `findings`.

**That is forced by a rule already in `readoutRules`: never attach a fix to a finding whose severity
is `ok`.** Every mark is `ok` by construction, because a gradient is a choice and not a defect -- see
[readout.md](readout.md). A fix pointing at one would render the "fix written" pointer beside a row
in the one group that grades nothing, which is exactly the confusion that rule exists to prevent. So
the fix comes back with `finding: null`, which `readoutRules` already names as a normal answer, and
under the `distinctiveness` category.

`samenessRules()` in `lib/ai/prompt.ts` is shared for the reason `marketRules` and `competitorRules`
are, and it bans two sentences that fail differently:

- **Origin.** "Your page was generated by AI" is a claim about how the page was made, which nobody
  measured. `evidenceRules` does not cover it, because the sentence carries no number.
- **Outcome.** "Replacing the gradient will build trust" is the delta rule surfacing where it is most
  tempting, because the advice sounds obviously right.

What it may do is argue the mechanism about this page: three cards each carrying a generic noun tell
a visitor nothing, and a button reading "Get started" does not say what happens next. Then write the
replacement.

## 5. Visibility audit: `generateVisibility`

A third `generateObject` in the same `Promise.all`, also resolving to `[]` on any failure. Fed
`PageSeo`, the composed page text, several `PageStructure` fields, the `fetchCrawlerAccess` result
from [scraping.md](scraping.md), and the measured `PageKeywords` terms.

**The page text is a late addition and it fixed a real class of invented finding.** This call had
none of it while its `ai_answerability` category asked whether the page states in plain readable text
what the product is, who it is for and **what it costs.** A judgement about a body the model had
never been given. It filled the gap: run against our own landing page it told us to publish a price
that has been in the served HTML since the packs existed, and to add a cancellation guarantee for a
subscription the product does not sell. Neither was a bad inference from what it had; both were
assertions about a page it could not read.

The keyword block exists so a fix can name **where** to put a term the page already uses. Its prompt
line states the prohibition inline, these are the page's own words, never search volume and never a
ranking opportunity, because the model is being handed a list that looks exactly like the output of a
keyword tool. See
[invariants.md](invariants.md#keywords-measure-the-pages-own-words-never-the-index).

`visibilityPrompt` carries the playbook's evidence discipline plus the rule the whole feature's
credibility rests on, see
[invariants.md](invariants.md#the-audit-measured-the-page-not-the-index).


## 6. Market

`marketRules(market)` in `lib/ai/prompt.ts` is shared by every prompt that receives a market, because
the risk is identical in all of them and must not be phrased three ways. See
[invariants.md](invariants.md#the-market-is-a-filter-on-what-may-be-recommended-never-a-fact-the-model-knows).

Detection is `lib/market.ts`, measured from the page, see
[invariants.md](invariants.md#the-market-is-measured-from-the-page-never-taken-from-the-ui-locale).

## 7. Output language

`systemPrompt`, `alternateVariantsPrompt` and `playbookPrompt` take a language name
(`AI_OUTPUT_LANGUAGE[locale]`) and instruct the model to write `problem`, `rationale`, `copy` and
`evidence` in it, **as a native speaker would rather than as a word-for-word translation**.

`POST /api/analyses` passes the caller's UI locale and stores it on `analyses.locale`; the alternates
route reads that stored value. See
[invariants.md](invariants.md#generated-content-is-pinned-to-the-locale-it-was-written-in).

The typographic rule restricts **punctuation only.** See
[invariants.md](invariants.md#pt-br-is-a-rewrite-not-a-translation).

## 7b. Voice

`writingRules` says which language and which punctuation. `voiceRules` says how a sentence is built,
and it is a separate fragment for that reason: the two get edited for different reasons, and one
combined block is how an edit to the punctuation rule silently rewrites the style one. Both are
appended together at all four sites, so every prompt that writes prose carries both.

What it forbids is the set of habits that make a sentence read as machine written and that no other
rule here catches: sales language and inflated importance, a participle clause bolted onto a fact to
fake a mechanism, three of something because three sounds finished, "not just X but Y", clipped
negative endings, filler, and a closing line of encouragement. The no-invented-number rule in
`variantCopyRules` already covers its own ground and is not repeated.

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
