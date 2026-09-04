'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BRIEF_FIELD, BRIEF_OPTION } from '@/lib/enums'
import { t } from '@/lib/i18n/format'
import { briefIsComplete, type BriefParts } from '@/lib/brief'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'
import { cn } from '@/lib/utils'

/**
 * Four questions, one screen each, answered by tapping.
 *
 * It replaced four text inputs, which replaced one textarea, and the direction is the point: a blank
 * box asks the reader to work out what would be useful, and the overwhelming majority answered it by
 * writing nothing at all. A tappable answer costs one gesture and the step is done.
 *
 * **What is stored is still a sentence, not an id.** The option's own label goes into `BriefParts`,
 * so `lib/brief.ts` never learned about options, the prompt receives the same prose it always did,
 * and `BRIEF_OTHER` is free text landing in exactly the same place. That is what keeps the presets a
 * shortcut rather than a schema: adding, renaming or dropping one changes nothing downstream.
 *
 * Selecting advances on its own. There is no Next button to hunt for, and the one control that could
 * have moved the page -- a link, an anchor, a scrollIntoView -- is deliberately absent: every step
 * change here is state, so the viewport never jumps under the reader's finger.
 *
 * **A brief that already has all four answers opens as a summary.** The dashboard hands over the
 * last brief this reader wrote, which is what makes the price four taps once and zero afterwards.
 * Replaying question one over it printed "step 1 of 4" above a progress bar with every segment
 * already filled, the counter and the bar disagreeing about the same four answers. What the reader
 * needs there is to check that those answers still describe the page they are about to spend a
 * credit on, and to change the one that does not.
 */
export function BriefWizard({
  value,
  onChange,
  disabled,
  copy
}: {
  value: BriefParts
  onChange: (next: BriefParts) => void
  disabled?: boolean
  copy: Dictionary['urlForm']
}) {
  // `null` is the summary. A complete brief starts there; anything else starts at the first question
  // with no answer behind it, so a partial brief resumes rather than restarts.
  const [step, setStep] = useState<number | null>(() =>
    briefIsComplete(value) ? null : firstUnanswered(value)
  )
  const [writing, setWriting] = useState(false)

  const total = BRIEF_FIELD.length

  function goTo(next: number | null) {
    setWriting(false)
    setStep(next)
  }

  if (step === null) {
    return (
      <div className="space-y-3">
        <ul className="divide-y rounded-md border">
          {BRIEF_FIELD.map((f, i) => (
            <li key={f} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0 space-y-0.5">
                <p className="panel-label text-nano text-muted-foreground">
                  {copy.briefFields[f].label}
                </p>
                <p className="text-sm">{value[f]}</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => goTo(i)}
                className="panel-label shrink-0 text-micro text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
              >
                {copy.briefWizard.edit}
              </button>
            </li>
          ))}
        </ul>
        <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {copy.briefWizard.done}
        </p>
      </div>
    )
  }

  const current = step
  const field = BRIEF_FIELD[current]
  const last = current === total - 1
  const fieldCopy = copy.briefFields[field]

  // One narrow cast, and the reason it is here rather than in the types: `field` is the whole union,
  // so `fieldCopy.options` is a union of four differently-keyed objects and TypeScript cannot know
  // the id being looked up belongs to this one. `BRIEF_OPTION` is keyed by the same field, so it
  // always does. Widening the dictionary shape instead would cost the guarantee that pt-BR has every
  // option, which is the more valuable of the two.
  const options = fieldCopy.options as Record<string, string>

  function answer(text: string) {
    const next = { ...value, [field]: text }
    onChange(next)
    setWriting(false)
    // The summary is where a finished brief lives, so the last answer lands there whichever question
    // it happened to be -- including the single edit somebody opened from the summary itself.
    setStep(briefIsComplete(next) ? null : firstUnanswered(next, current + 1))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="panel-label text-micro text-muted-foreground">
            {t(copy.briefWizard.step, { step: current + 1, total })}
          </p>
          {(current > 0 || briefIsComplete(value)) && (
            <button
              type="button"
              onClick={() => goTo(briefIsComplete(value) ? null : current - 1)}
              className="panel-label text-micro text-muted-foreground transition-colors hover:text-foreground"
            >
              {copy.briefWizard.back}
            </button>
          )}
        </div>

        {/* Segment per question rather than a continuous bar: four steps read as four, and a filled
            segment is a question with an answer behind it, which a percentage would not say. */}
        <div className="flex gap-1" aria-hidden>
          {BRIEF_FIELD.map((f, i) => (
            <span
              key={f}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                value[f].trim() ? 'bg-purple' : i === current ? 'bg-foreground/30' : 'bg-border'
              )}
            />
          ))}
        </div>
      </div>

      <fieldset disabled={disabled} className="space-y-3">
        <legend className="font-display text-base font-semibold tracking-tight">
          {fieldCopy.question}
        </legend>

        <div className="grid gap-2">
          {BRIEF_OPTION[field].map((option) => {
            const label = options[option]
            const chosen = value[field] === label

            return (
              <button
                key={option}
                type="button"
                onClick={() => answer(label)}
                aria-pressed={chosen}
                className={cn(
                  'rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
                  'hover:border-foreground/30 hover:bg-muted/50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  chosen && 'border-purple bg-purple/10'
                )}
              >
                {label}
              </button>
            )
          })}

          {writing ? (
            <Input
              autoFocus
              defaultValue={value[field]}
              placeholder={copy.briefWizard.otherPlaceholder}
              onBlur={(e) => answer(e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Otherwise this submits the URL form the wizard is sitting inside, and the reader
                  // loses the analysis they had not finished describing.
                  e.preventDefault()
                  answer(e.currentTarget.value.trim())
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setWriting(true)}
              className="rounded-md border border-dashed px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {copy.briefWizard.other}
            </button>
          )}
        </div>

        {!last && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => goTo(current + 1)}>
              {copy.briefWizard.skip}
            </Button>
          </div>
        )}
      </fieldset>
    </div>
  )
}

/**
 * The next question with nothing behind it, searched from `from` and wrapping once.
 *
 * Wrapping is what picks up a question the reader skipped: answering the last one then sends them
 * back to the gap rather than to a summary that would have to show a blank row.
 */
function firstUnanswered(parts: BriefParts, from = 0): number {
  for (let i = 0; i < BRIEF_FIELD.length; i++) {
    const index = (from + i) % BRIEF_FIELD.length
    if (!parts[BRIEF_FIELD[index]].trim()) return index
  }
  return 0
}
