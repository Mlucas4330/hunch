'use client'

import { useI18n } from '@/components/i18n-provider'
import { formatNumber } from '@/lib/i18n/format'
import type { KeywordTerm, PageKeywords } from '@/lib/keywords'

const SURFACES = ['inTitle', 'inH1', 'inMetaDescription', 'inHeadings'] as const

export function KeywordTable({ keywords }: { keywords: PageKeywords | null }) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout.keywords

  if (!keywords?.terms.length) return null

  return (
    <div className="space-y-2 break-inside-avoid" data-testid="keyword-table">
      <p className="panel-label text-nano text-muted-foreground">{copy.title}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-sm border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2 font-display font-semibold">{copy.term}</th>
              <th className="p-2 font-medium text-muted-foreground">{copy.count}</th>
              {SURFACES.map((surface) => (
                <th key={surface} className="p-2 font-medium text-muted-foreground">
                  {copy.surfaces[surface]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keywords.terms.map((term) => (
              <tr key={term.term} className="border-b last:border-0">
                <td className="p-2 font-display font-semibold">{term.term}</td>
                <td className="p-2 tabular-nums text-muted-foreground">
                  {formatNumber(term.count, locale)}
                </td>
                {SURFACES.map((surface) => (
                  <td key={surface} className="p-2 text-muted-foreground">
                    {cell(term, surface, dictionary.readout.presence)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{copy.hint}</p>
    </div>
  )
}

function cell(
  term: KeywordTerm,
  surface: (typeof SURFACES)[number],
  presence: { yes: string; no: string }
): string {
  return term[surface] ? presence.yes : presence.no
}
