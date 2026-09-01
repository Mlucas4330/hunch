'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BRIEF_FIELD, BRIEF_OPTION } from '@/lib/enums'
import { t } from '@/lib/i18n/format'
import type { BriefParts } from '@/lib/brief'
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
  const [step, setStep] = useState(0)
  const [writing, setWriting] = useState(false)

  const field = BRIEF_FIELD[step]
  const total = BRIEF_FIELD.length
  const last = step === total - 1
  const fieldCopy = copy.briefFields[field]

  // One narrow cast, and the reason it is here rather than in the types: `field` is the whole union,
  // so `fieldCopy.options` is a union of four differently-keyed objects and TypeScript cannot know
  // the id being looked up belongs to this one. `BRIEF_OPTION` is keyed by the same field, so it
  // always does. Widening the dictionary shape instead would cost the guarantee that pt-BR has every
  // option, which is the more valuable of the two.
  const options = fieldCopy.options as Record<string, string>

  function answer(text: string) {
    onChange({ ...value, [field]: text })
    setWriting(false)
    if (!last) setStep(step + 1)
  }

  function goTo(next: number) {
    setWriting(false)
    setStep(next)
  }

  const answered = BRIEF_FIELD.filter((f) => value[f].trim()).length

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="panel-label text-micro text-muted-foreground">
            {t(copy.briefWizard.step, { step: step + 1, total })}
          </p>
          {step > 0 && (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
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
                value[f].trim() ? 'bg-purple' : i === step ? 'bg-foreground/30' : 'bg-border'
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
            <Button type="button" variant="outline" size="sm" onClick={() => goTo(step + 1)}>
              {copy.briefWizard.skip}
            </Button>
          </div>
        )}
      </fieldset>

      {answered === total && (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {copy.briefWizard.done}
        </p>
      )}
    </div>
  )
}
