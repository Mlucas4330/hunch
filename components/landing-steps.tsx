import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  FLOW_CATEGORY_BADGE_CLASS,
  impactScoreRailClass,
  READOUT_SEVERITY_CLASS,
  STEP_CHANNEL_CLASS
} from '@/lib/constants'
import { scoreSeverity } from '@/lib/score'
import { t } from '@/lib/i18n/format'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import { cn } from '@/lib/utils'

type HowCopy = Dictionary['landing']['how']
type Previews = HowCopy['previews']

/**
 * The three steps, as cards that show the screen each one produces.
 *
 * **They were three columns of prose, and the section's whole job is to show rather than describe.**
 * A number, a hairline, a heading and a paragraph -- and below them a `<ProductDemo>` that renders
 * `null` whenever `NEXT_PUBLIC_SUPADEMO_DEMO_ID` is unset, which is most environments. So the one
 * section that exists to answer "what am I about to get" answered it in words only.
 *
 * **The illustrations are CSS, never screenshots, and four things decide that.** A PNG of a light
 * screen is broken in dark mode, which this app now has. There is no `public/` directory, no `images`
 * config and no `img-src` for a new host in the CSP, so a screenshot is infrastructure rather than
 * design. Three images of UI on the one page that sells "your page is too heavy" argues against
 * itself. And the pattern already exists: `HeroReadout` in app/(app)/page.tsx is a CSS reproduction of
 * the real readout card, fed by dictionary strings. These are that, three times.
 *
 * **Every preview is `aria-hidden`, and that is not laziness.** It is a picture of an interface, not
 * an interface: the numbers in it are stand-ins the way `heroCard.score` is. The step's real heading
 * and body sit directly above each one and say the same thing in words, so announcing a decorative
 * `9/10` as though it were somebody's data would be worse than announcing nothing.
 *
 * The previews are paired with steps by name in `STEP_PREVIEW` rather than by array index, so the
 * order of `dictionary.landing.steps` and the order of the illustrations cannot drift apart silently.
 */
export function LandingSteps({ copy, steps }: { copy: HowCopy; steps: Dictionary['landing']['steps'] }) {
  const previews = [
    <UrlPreview key="url" copy={copy.previews.url} />,
    <ScorePreview key="score" copy={copy.previews.score} />,
    <FixPreview key="fix" copy={copy.previews.fix} />
  ]

  return (
    // Two up, one wide -- the third step is the one the product is actually selling, so it gets the
    // full measure and sets its text beside its picture instead of above it.
    <ol className="grid gap-4 lg:grid-cols-2">
      {steps.map((step, i) => {
        const wide = i === steps.length - 1

        return (
          <li key={step.label} className={cn(wide && 'lg:col-span-2')}>
            <Card
              className={cn(
                'h-full p-6 shadow-elev-1 sm:p-8',
                wide && 'md:grid md:grid-cols-2 md:items-center md:gap-8'
              )}
            >
              <div className="space-y-3">
                <span
                  className={cn(
                    'panel-label inline-flex rounded-full px-2.5 py-1 text-nano',
                    STEP_CHANNEL_CLASS[i % STEP_CHANNEL_CLASS.length]
                  )}
                >
                  {t(copy.stepLabel, { n: String(i + 1).padStart(2, '0') })}
                </span>
                <h3 className="text-balance font-display text-xl font-bold tracking-tight">
                  {step.label}
                </h3>
                <p className="max-w-prose text-sm text-muted-foreground">{step.body}</p>
              </div>

              {/* On the wide card the picture is the second grid column; on the two above it it
                  follows the text, so the margin is only needed in the stacked case. */}
              <div className={cn('mt-6', wide && 'md:mt-0')}>{previews[i]}</div>
            </Card>
          </li>
        )
      })}
    </ol>
  )
}

/** Step 1: what `components/url-input-form.tsx` looks like with a URL in it. */
function UrlPreview({ copy }: { copy: Previews['url'] }) {
  return (
    <Frame>
      <div className="flex flex-col gap-2 @xs:flex-row">
        {/* The real field's classes, minus every interactive state -- this never takes focus. */}
        <span className="flex h-10 min-w-0 flex-1 items-center truncate rounded-md border border-input bg-background px-3 font-mono text-sm text-muted-foreground">
          {copy.placeholder}
        </span>
        <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          {copy.cta}
        </span>
      </div>
    </Frame>
  )
}

/**
 * Step 2: the readout's group cards, as rails.
 *
 * **Deliberately not the big score.** `HeroReadout` puts `47/100` at `text-7xl` one section above
 * this on the same screen; repeating it would be the same picture twice. The per-group rails are what
 * the readout actually shows and the hero does not, so this adds a screen instead of echoing one.
 */
function ScorePreview({ copy }: { copy: Previews['score'] }) {
  return (
    <Frame>
      <p className="panel-label mb-3 text-nano text-muted-foreground">{copy.label}</p>
      <div className="space-y-2">
        {copy.groups.map((group) => (
          <div key={group.label} className="flex items-stretch overflow-hidden rounded-md border">
            <span
              className={cn(
                'flex w-12 shrink-0 flex-col items-center justify-center border-r py-1.5 font-mono tabular-nums',
                READOUT_SEVERITY_CLASS[scoreSeverity(Number(group.value))]
              )}
            >
              <span className="text-base font-semibold leading-none">{group.value}</span>
              <span className="text-nano leading-none opacity-70">{copy.outOf}</span>
            </span>
            <span className="flex min-w-0 flex-1 items-center truncate px-3 text-sm">
              {group.label}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

/** Step 3: one ranked fix row -- the impact rail, the category badge and the title, as `DisclosureCard` renders them. */
function FixPreview({ copy }: { copy: Previews['fix'] }) {
  return (
    <Frame>
      <div className="flex items-stretch overflow-hidden rounded-md border">
        <span
          className={cn(
            'flex w-14 shrink-0 flex-col items-center justify-center border-r font-mono tabular-nums',
            impactScoreRailClass(Number(copy.impact))
          )}
        >
          <span className="text-xl font-semibold leading-none">{copy.impact}</span>
          <span className="text-micro leading-none opacity-70">{copy.outOf}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1 p-4">
          <span className="flex">
            <Badge className={FLOW_CATEGORY_BADGE_CLASS.signup_friction}>{copy.category}</Badge>
          </span>
          <span className="text-pretty font-display text-base font-medium leading-snug">
            {copy.title}
          </span>
        </span>
      </div>
      <p className="panel-label mt-2 text-nano text-muted-foreground">{copy.drawer}</p>
    </Frame>
  )
}

/**
 * The surface every preview sits on.
 *
 * `@container` so `UrlPreview` can put its field and button on one row when its own box is wide
 * enough, rather than guessing from the viewport -- the previews live in a two-up grid on the first
 * two cards and a half-width column on the third, and a viewport breakpoint cannot tell those apart.
 * The same reason `url-input-form.tsx` uses one. See docs/analysis-ui.md.
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container rounded-lg border bg-muted/40 p-4" aria-hidden="true">
      {children}
    </div>
  )
}
