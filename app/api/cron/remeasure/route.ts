import { NextResponse } from 'next/server'
import { authorizeCron } from '@/lib/cron-auth'
import { enqueue, jobId, registerRunner } from '@/lib/queue'
import { REMEASURE_JOB_KIND, runRemeasure } from '@/lib/run-remeasure'
import { analysesDueForRemeasure } from '@/lib/subscriptions'
import { log } from '@/lib/log'

export const runtime = 'nodejs'

registerRunner(REMEASURE_JOB_KIND, runRemeasure)

/**
 * The weekly sweep: measures every active subscriber's pages again.
 *
 * **It enqueues rather than measuring in line, and that is the change from the version that was
 * deleted.** The old one looped `measurePage` serially inside the request, which took browser slots
 * without ever consulting the queue -- so a sweep and a reader who just clicked Analyze competed
 * blindly, and the sweep's own progress was invisible. Going through `enqueue` means it obeys
 * `QUEUE_MAX_DEPTH`, shares the drain fairly, and reports its depth like everything else.
 *
 * **The kind is `remeasure`, never `analysis`.** `runAnalysis` returns early on a row that already
 * holds a measurement, so `analysis:<id>` for one of these pages is a guaranteed no-op. See
 * lib/run-remeasure.ts.
 *
 * The runner is registered at module scope, as every kind is, which means this route being reached
 * is what teaches the worker to run one. A `remeasure` job orphaned by a restart and reaped before
 * this module has loaded is answered `unavailable` -- it costs that page one week and the next sweep
 * picks it up, because the cutoff is measured from the last snapshot.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const due = await analysesDueForRemeasure()

  let queued = 0

  for (const analysis of due) {
    try {
      const job = await enqueue(jobId(REMEASURE_JOB_KIND, analysis.id))

      // A full queue is not an error: the pages that did not fit are still due tomorrow, and taking
      // the slots a live reader is waiting on would be the wrong trade for work nobody is watching.
      if (job?.status === 'unavailable') break

      queued += 1
    } catch (error) {
      log.error('remeasure.failed', error, { analysis: analysis.id })
    }
  }

  log.info('remeasure.swept', { due: due.length, queued })

  return NextResponse.json({ due: due.length, queued })
}
