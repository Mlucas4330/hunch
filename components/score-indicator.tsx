import { effortScoreFillClass, impactScoreFillClass } from '@/lib/constants'
import { cn } from '@/lib/utils'

const SEGMENTS = Array.from({ length: 10 }, (_, i) => i)

export function ScoreIndicator({
  label,
  score,
  kind
}: {
  label: string
  score: number
  kind: 'impact' | 'effort'
}) {
  const fill = kind === 'impact' ? impactScoreFillClass(score) : effortScoreFillClass(score)

  return (
    <div className="flex items-center gap-2" aria-label={`${label} ${score} of 10`}>
      <span className="panel-label text-[0.6rem] text-muted-foreground">{label}</span>
      <div className="flex items-end gap-0.5" aria-hidden>
        {SEGMENTS.map((i) => (
          <span
            key={i}
            className={cn('h-3.5 w-1 rounded-[1px]', i < score ? fill : 'bg-muted')}
          />
        ))}
      </div>
      <span className="font-mono text-xs font-semibold tabular-nums">
        {score}
        <span className="text-muted-foreground">/10</span>
      </span>
    </div>
  )
}
