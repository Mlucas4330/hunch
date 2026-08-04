'use client'

import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/components/i18n-provider'
import { HYPOTHESIS_TARGET, type HypothesisTarget } from '@/lib/enums'
import { cn } from '@/lib/utils'

export const HYPOTHESIS_SORT = ['impact', 'effort', 'quickWins'] as const
export type HypothesisSort = (typeof HYPOTHESIS_SORT)[number]

export type TargetFilter = HypothesisTarget | 'all'
const TARGET_FILTERS: TargetFilter[] = ['all', ...HYPOTHESIS_TARGET]

export function HypothesisFilters({
  sort,
  onSort,
  target,
  onTarget,
  hideCompleted,
  onHideCompleted
}: {
  sort: HypothesisSort
  onSort: (sort: HypothesisSort) => void
  target: TargetFilter
  onTarget: (target: TargetFilter) => void
  hideCompleted: boolean
  onHideCompleted: (hide: boolean) => void
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.hypothesisList

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="hypothesis-filters">
      <ChipGroup label={copy.sortLabel}>
        {HYPOTHESIS_SORT.map((option) => (
          <Chip key={option} active={sort === option} onClick={() => onSort(option)}>
            {copy.sort[option]}
          </Chip>
        ))}
      </ChipGroup>

      <ChipGroup label={copy.filterLabel}>
        {TARGET_FILTERS.map((option) => (
          <Chip key={option} active={target === option} onClick={() => onTarget(option)}>
            {copy.filter[option]}
          </Chip>
        ))}
        <Chip active={hideCompleted} onClick={() => onHideCompleted(!hideCompleted)}>
          {copy.filter.hideCompleted}
        </Chip>
      </ChipGroup>
    </div>
  )
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="panel-label text-[0.6rem] text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}>
      <Badge
        className={cn(
          'transition-colors',
          active
            ? 'border-purple bg-purple/15 text-purple'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {children}
      </Badge>
    </button>
  )
}
