import { NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { UNSUBSCRIBE_PATH } from '@/lib/constants'
import { siteOrigin } from '@/lib/app-url'
import { log } from '@/lib/log'

/**
 * Leaving the sequence, from a link in a mail client.
 *
 * **A GET that writes, deliberately.** Making the reader confirm on a form is a second click, and an
 * unsubscribe that takes two clicks is an unsubscribe people give up on and report as spam instead.
 * The token is the whole credential and it is unguessable, so the worst a prefetching mail client
 * can do is unsubscribe the person it was fetching mail for. The POST below is the same write for a
 * mail client rather than a person, and exists because `List-Unsubscribe-Post` promises it.
 *
 * **The row is updated, never deleted.** Deleting it would let the next submit of the same address
 * for the same report silently re-subscribe them, which is the reason `unsubscribed_at` exists
 * rather than a delete. See docs/data-model.md.
 *
 * It answers a redirect rather than JSON because a person is looking at it. The confirmation page is
 * the same one for a token that worked and a token that did not: telling a stranger whether a token
 * is real is the only thing this endpoint could leak.
 */
export async function GET(request: Request) {
  await unsubscribe(request)

  return NextResponse.redirect(new URL(UNSUBSCRIBE_PATH, siteOrigin()))
}

/**
 * The same unsubscribe, submitted by the mail client instead of by the reader.
 *
 * `List-Unsubscribe-Post: List=One-Click` promises this endpoint answers a POST, and Gmail sends one
 * when somebody uses the unsubscribe button beside the sender's name. It never renders, so it
 * answers `200` rather than a redirect: nobody is looking at it, and a mail client reads the status
 * alone.
 *
 * **Declaring the header without this handler is worse than declaring nothing**: the button appears,
 * the POST answers `405`, and the reader who tried to leave politely reaches for the spam button
 * instead. See lib/email.ts.
 */
export async function POST(request: Request) {
  await unsubscribe(request)

  return new NextResponse(null, { status: 200 })
}

async function unsubscribe(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  const parsed = z.string().uuid().safeParse(token)

  if (!parsed.success) return

  try {
    const [row] = await db
      .update(leads)
      .set({ unsubscribedAt: new Date() })
      .where(and(eq(leads.unsubscribeToken, parsed.data), isNull(leads.unsubscribedAt)))
      .returning({ id: leads.id })

    if (row) log.info('lead.unsubscribed', { lead: row.id })
  } catch (error) {
    // The reader must see the confirmation either way. A failure here is ours to find in the log,
    // and telling them it went wrong invites the spam button instead.
    log.error('lead.sequence_failed', error, { stage: 'unsubscribe' })
  }
}
