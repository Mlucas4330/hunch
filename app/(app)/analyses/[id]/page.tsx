import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'

/**
 * The document lives at `/r/<embedKey>` for everyone, so all this does is trade an id for a key.
 *
 * **The owner check is not ceremony.** The embed key is the public report's only credential, so a
 * redirect that resolved any id into one would turn a leaked id into a leaked report. With the check
 * in place `/analyses` stays in `PROTECTED_PREFIXES` and `app/robots.ts` needs no change.
 */
export default async function AnalysisRedirectPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) notFound()

  const analysis = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, user.id)),
    columns: { embedKey: true }
  })

  if (!analysis) notFound()

  redirect(`/r/${analysis.embedKey}`)
}
