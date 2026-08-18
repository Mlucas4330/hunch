'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArmStat, summary } from '@/components/experiment-panel'
import { SectionBadge } from '@/components/section-badge'
import {
  EXPERIMENT_RECOMMENDATION_BADGE_CLASS,
  EXPERIMENT_STATUS_BADGE_CLASS
} from '@/lib/constants'
import type { ExperimentStatus, Section } from '@/lib/enums'
import { useI18n } from '@/components/i18n-provider'
import { experimentResult } from '@/lib/stats'
import { cn } from '@/lib/utils'

const EXAMPLE_TEST_SECTION: Section = 'headline'
const EXAMPLE_TEST_STATUS: ExperimentStatus = 'completed'

// Clears MIN_SAMPLE and MIN_CONVERSIONS on purpose: everything the card shows is derived from these
// by experimentResult(), so the example can only ever render a verdict the real gates would allow.
const EXAMPLE_TEST_COUNTS = {
  control: { impressions: 4_000, conversions: 160 },
  variant: { impressions: 4_000, conversions: 200 }
}

export function ExampleTest() {
  const { locale, dictionary } = useI18n()
  const copy = dictionary.exampleTest
  const result = experimentResult(EXAMPLE_TEST_COUNTS)
  const { control, variant, upliftPct, pValue, significant, leader, recommendation } = result

  return (
    <Card className="border-dashed" data-testid="example-test">
      <CardHeader className="space-y-2">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <div className="flex flex-wrap items-center gap-2">
          <SectionBadge section={EXAMPLE_TEST_SECTION} />
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              EXPERIMENT_STATUS_BADGE_CLASS[EXAMPLE_TEST_STATUS]
            )}
          >
            {dictionary.labels.experimentStatus[EXAMPLE_TEST_STATUS]}
          </span>
        </div>
        <CardTitle className="text-sm font-medium text-muted-foreground">{copy.problem}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 rounded-md bg-muted p-3">
          <p className="text-sm text-muted-foreground line-through">{copy.controlCopy}</p>
          <p className="text-sm font-medium">{copy.variantCopy}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ArmStat
            label={dictionary.labels.experimentArm.control}
            arm={control}
            isLeader={leader === 'control'}
            locale={locale}
          />
          <ArmStat
            label={dictionary.labels.experimentArm.variant}
            arm={variant}
            isLeader={leader === 'variant'}
            locale={locale}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {summary(upliftPct, pValue, significant, dictionary, locale)}
        </p>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="panel-label text-[0.7rem] text-muted-foreground">
            {dictionary.experimentPanel.recommendation}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              EXPERIMENT_RECOMMENDATION_BADGE_CLASS[recommendation]
            )}
          >
            {dictionary.labels.experimentRecommendation[recommendation]}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">{copy.caption}</p>
      </CardContent>
    </Card>
  )
}
