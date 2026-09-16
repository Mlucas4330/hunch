import { NextResponse } from 'next/server'
import { loadBatch } from '@/lib/bulk-batches'
import { getCurrentUser } from '@/lib/current-user'
import { REPORT_PATH } from '@/lib/constants'
import { siteOrigin } from '@/lib/app-url'
import { getDictionary } from '@/lib/i18n'

export const runtime = 'nodejs'

// Excel in pt-BR reads a UTF-8 file with no BOM as Latin-1 and mangles every accent, and accents are
// not optional in Portuguese. Three bytes to keep the file readable in the tool it is opened in.
const BOM = '﻿'

function cell(value: string | number | null): string {
  if (value === null) return ''

  // Quote everything and double the quotes inside: a business impact sentence carries commas, and a
  // URL can carry one too.
  return `"${String(value).replaceAll('"', '""')}"`
}

/**
 * The batch as a spreadsheet, for writing outreach from.
 *
 * Owner-checked through `loadBatch`. The header labels come from the dictionary, in the reader's own
 * locale; the data does not, because it is the page's own words and the report's own numbers.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const [batch, dictionary] = await Promise.all([loadBatch(id, user.id), getDictionary()])

  if (!batch) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const columns = dictionary.bulk.results.columns
  const origin = siteOrigin()

  const header = [columns.page, columns.score, columns.critical, columns.problem, columns.report]
    .map(cell)
    .join(',')

  const lines = batch.rows.map((row) =>
    [
      cell(row.url),
      // Empty, never a zero: a page PageSpeed could not measure has no score.
      cell(row.score),
      cell(row.finished ? row.criticalCount : null),
      cell(row.failed ? dictionary.bulk.results.failed : row.mainProblem),
      cell(row.embedKey && !row.failed ? `${origin}${REPORT_PATH}/${row.embedKey}` : null)
    ].join(',')
  )

  const csv = BOM + [header, ...lines].join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hunch-${id}.csv"`
    }
  })
}
