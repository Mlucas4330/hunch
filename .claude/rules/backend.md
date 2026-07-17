## Database schema

```
users
- id         (uuid, PK)
- email      (text, unique)
- name       (text)
- avatar_url (text, nullable)
- created_at (timestamp)

analyses
- id          (uuid, PK)
- user_id     (FK -> users.id)
- url         (text)
- brief       (text, nullable: optional business details the founder supplied for finished copy)
- competitors (jsonb, nullable: { name, url }[] benchmarked against)
- created_at  (timestamp)

hypotheses
- id             (uuid, PK)
- analysis_id    (FK -> analyses.id)
- section        (enum: SECTIONS)
- problem        (text)
- current_copy   (text)
- impact_score   (int, 1-10)
- effort_score   (int, 1-10)
- rationale      (text)
- created_at     (timestamp)

variants
- id             (uuid, PK)
- hypothesis_id  (FK -> hypotheses.id)
- copy           (text)
- evidence       (text, nullable: competitor pattern this variant borrows/beats)
- position       (int: AI rank within the hypothesis; position 0 = recommended challenger)
- created_at     (timestamp)
```

**Relations**

```
users      1 -> N  analyses
analyses   1 -> N  hypotheses
hypotheses 1 -> N  variants
```

## API routes

### Auth

`GET|POST /api/auth/[...nextauth]`
Standard NextAuth catch-all. Handles Google OAuth callback, session creation, and user upsert into
`users` on first login. An admin credentials provider (ADMIN_EMAIL/ADMIN_PASSWORD) is also available
for local dev and the e2e suite.

### Analyses

`POST /api/analyses`
Core route. Chain: Puppeteer scrape -> preprocess HTML -> competitor research -> Claude API ->
persist -> return.

Request:

```json
{ "url": "https://example.com", "brief": "optional business details", "competitorUrls": ["https://rival.com"] }
```

`brief` (optional) is stored on the analysis and passed into generation so variants come back as
finished copy instead of `[placeholders]`. `competitorUrls` (optional, max 3) grounds the hypotheses
on the pages the user chose; when omitted, `analyzeLandingPage` runs a web search instead.

Response:

```json
{
  "analysis": {
    "id": "uuid",
    "url": "https://example.com",
    "created_at": "timestamp",
    "hypotheses": [ ...HypothesisRow[] ]
  }
}
```

Errors:

- `401` - unauthorized
- `422` - invalid or unsupported URL
- `502` - Puppeteer scrape failed
- `500` - Claude API or DB failure

`GET /api/analyses`
Returns analysis history, paginated. Query params: `?page=1&limit=10`.

```json
{ "analyses": [ ...AnalysisRow[] ], "total": 12, "page": 1 }
```

`GET /api/analyses/[id]`
Returns one analysis with all hypotheses (and their variants). `404` if not found or not owned by the
requesting user.

`DELETE /api/analyses/[id]`
Deletes one analysis (cascades to hypotheses + variants). `404` if not owned.

## AI pipeline

### 1. Preprocess scraped HTML

Strip scripts, styles, and meta tags. Extract semantic text only:

```
H1: ...
Subheadline: ...
CTA button: ...
Feature: ...
Testimonial: ...
Pricing: ...
```

### 2. Zod schema (matches DB schema)

```typescript
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { SECTIONS } from '@/lib/enums'

const VariantSchema = z.object({ copy: z.string(), evidence: z.string() })

const HypothesisSchema = z.object({
    section: z.enum(SECTIONS),
    problem: z.string(),
    current_copy: z.string(),
    variants: z.array(VariantSchema).length(3),
    impact_score: z.number().int().min(1).max(10),
    effort_score: z.number().int().min(1).max(10),
    rationale: z.string()
})

const CompetitorSchema = z.object({ name: z.string(), url: z.string() })

const AnalysisOutputSchema = z.object({
    competitors: z.array(CompetitorSchema).max(4),
    hypotheses: z.array(HypothesisSchema).min(5).max(8)
})
```

### 2b. Competitor research (web search)

Before structured generation, run a web-search step with the official Anthropic SDK
(`@anthropic-ai/sdk`, tool `web_search_20250305`) using `COMPETITOR_RESEARCH_PROMPT` to find 2-3
real competitor landing pages and summarize their positioning into a brief. The brief is passed
into `generateObject` so variants are grounded in competitors, and each variant carries an
`evidence` line naming the competitor pattern it borrows. Degrades gracefully to an empty brief
(no `ANTHROPIC_API_KEY` / failure) so generation still succeeds. Skipped when `E2E_FIXTURES=1`.

When the user supplies `competitorUrls`, this web-search step is skipped: `analyzeLandingPage`
scrapes those pages and concatenates the cleaned copy into the brief instead. A founder `brief`
(when present) is appended to the generation prompt so variants use those real facts and come back
finished rather than as `[placeholder]` templates.

### 3. Call

```typescript
const result = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: AnalysisOutputSchema,
    system: SYSTEM_PROMPT,
    prompt: `Landing page copy:\n\n${cleanedPageContent}\n\nCompetitive research brief:\n\n${brief}`
})

const { competitors, hypotheses } = result.object
```

### 4. System prompt (core IP - iterate carefully)

Focus on: grounding every hypothesis/variant in the competitor brief, specificity of claims, CTA
strength, social proof quality, value proposition clarity, friction reduction. Return 5-8
hypotheses ranked by impact score descending, each with 3 evidence-bearing variants **ordered
strongest-first** so `variants[0]` is the recommended challenger.

---

## Middleware - `middleware.ts`

Protect all `/dashboard` and `/analyses` routes with a NextAuth session check. Everything else
(the home page, `/auth/signin`, `/api/auth`) is public.
