'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { AGENCY_NOTE_MAX_LENGTH, REPORT_PATH } from '@/lib/constants'

/**
 * The agency's own words on one report.
 *
 * **The session and the ownership are both checked here, not inherited from the report that
 * rendered the form.** A server action is a public POST endpoint that happens to be written next to
 * a component, and the report it sits on is a page anyone with the link can open. See
 * docs/invariants.md.
 */

const NoteSchema = z.object({
  analysisId: z.string().uuid(),
  note: z.string().trim().max(AGENCY_NOTE_MAX_LENGTH)
})

export type AgencyNoteState = {
  ok: boolean
  message: 'saved' | 'invalid' | 'forbidden' | 'failed'
} | null

export async function setAgencyNoteAction(
  _previous: AgencyNoteState,
  formData: FormData
): Promise<AgencyNoteState> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: 'forbidden' }

  const parsed = NoteSchema.safeParse({
    analysisId: formData.get('analysisId'),
    note: formData.get('note')
  })

  if (!parsed.success) return { ok: false, message: 'invalid' }

  const analysis = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, parsed.data.analysisId), eq(analyses.userId, user.id)),
    columns: { embedKey: true }
  })

  // Somebody else's analysis and no analysis at all answer the same way, which is the point: neither
  // tells the caller anything about a row they do not own.
  if (!analysis) return { ok: false, message: 'forbidden' }

  try {
    await db
      .update(analyses)
      // Empty is how a note is removed, and it must read as no note rather than as an empty line on
      // the client's report.
      .set({ agencyNote: parsed.data.note.length > 0 ? parsed.data.note : null })
      .where(eq(analyses.id, parsed.data.analysisId))
  } catch (error) {
    console.error('[report] agency note not saved', error)
    return { ok: false, message: 'failed' }
  }

  revalidatePath(`${REPORT_PATH}/${analysis.embedKey}`)

  return { ok: true, message: 'saved' }
}
