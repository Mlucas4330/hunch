'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/submit-button'
import { useI18n } from '@/components/i18n-provider'
import { setAgencyNoteAction, type AgencyNoteState } from '@/lib/actions/analyses'
import { AGENCY_NOTE_MAX_LENGTH } from '@/lib/constants'
import { cn } from '@/lib/utils'

/**
 * A line from the agency to the person reading the report.
 *
 * **Two components in one file because they are two views of one column**, and splitting them is how
 * the editor eventually renders for somebody who cannot save. The owner gets the field; everybody
 * else gets the text, rendered as the agency's own words with nothing of ours beside it, for the
 * same reason the header shows their logo instead of our wordmark. See docs/invariants.md.
 */
export function AgencyNote({ note }: { note: string }) {
  const { dictionary } = useI18n()

  return (
    <aside className="border-l-2 border-purple-soft pl-4">
      <p className="sr-only">{dictionary.report.agencyNote.readerLabel}</p>
      <p className="text-pretty text-base leading-relaxed">{note}</p>
    </aside>
  )
}

export function AgencyNoteEditor({ analysisId, note }: { analysisId: string; note: string }) {
  const { dictionary } = useI18n()
  const copy = dictionary.report.agencyNote
  const [state, action] = useActionState<AgencyNoteState, FormData>(setAgencyNoteAction, null)

  return (
    <form action={action} className="space-y-2 print:hidden" data-testid="agency-note-editor">
      <input type="hidden" name="analysisId" value={analysisId} />

      <label className="block space-y-1">
        <span className="panel-label text-micro text-muted-foreground">{copy.label}</span>
        <textarea
          name="note"
          rows={3}
          defaultValue={note}
          maxLength={AGENCY_NOTE_MAX_LENGTH}
          placeholder={copy.placeholder}
          className="w-full rounded-md border bg-transparent p-3 text-sm leading-relaxed outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{copy.save}</SubmitButton>
        {state && (
          <p
            role="status"
            aria-live="polite"
            className={cn('text-sm', state.ok ? 'text-green' : 'text-destructive')}
          >
            {copy.result[state.message]}
          </p>
        )}
      </div>
    </form>
  )
}
