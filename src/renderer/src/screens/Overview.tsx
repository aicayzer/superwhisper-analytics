import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { ComparisonKpiGrid } from '@renderer/components/ComparisonKpiGrid'
import { formatActivityTick, formatCompact, formatDurationSec } from '@renderer/lib/format'
import { useRangeStore, windowFor } from '@renderer/state/rangeStore'
import { usePeriodComparison } from '@renderer/state/usePeriodComparison'
import type { Aggregates } from '@shared/types'
import { useMemo } from 'react'

/**
 * Overview — landing page.
 *
 *   1. Six-card KPI grid (3 × 2) with period-over-period comparison.
 *      "Last 30 days" compares to days 31–60 ago; "All time" hides the
 *      delta row and shows only the current value.
 *   2. Activity area chart filling the rest of the viewport.
 */
export function Overview(): React.JSX.Element {
  const { current, previous } = usePeriodComparison()
  const range = useRangeStore((s) => s.range)
  const { from, to } = useMemo(() => windowFor(range), [range])

  const getDuration = (a: Aggregates): number => a.overview.totalDurationSec
  const items = [
    {
      label: 'Recordings',
      current: current.overview.totalRecordings,
      previous: previous?.overview.totalRecordings ?? null,
      format: formatCompact
    },
    {
      label: 'Time spoken',
      current: getDuration(current),
      previous: previous ? getDuration(previous) : null,
      format: formatDurationSec
    },
    {
      label: 'Total words',
      current: current.overview.totalWords,
      previous: previous?.overview.totalWords ?? null,
      format: formatCompact
    },
    {
      label: 'Active days',
      current: current.overview.activeDays,
      previous: previous?.overview.activeDays ?? null
    },
    {
      label: 'Filler rate',
      current: current.language.fillerRatePct,
      previous: previous?.language.fillerRatePct ?? null,
      format: (v: number) => v.toFixed(2),
      unit: '%'
    },
    {
      label: 'Avg WPM',
      current: current.overview.avgWPM,
      previous: previous?.overview.avgWPM ?? null,
      unit: 'wpm'
    }
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <ComparisonKpiGrid items={items} />

      <ChartCard title="Recordings over time" slug="activity" className="min-h-0 flex-1">
        <ActivityArea
          data={current.daily}
          xKey="date"
          yKey="count"
          formatTick={formatActivityTick}
          from={from}
          to={to}
        />
      </ChartCard>
    </div>
  )
}
