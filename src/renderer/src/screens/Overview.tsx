import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatActivityTick, formatCompact, formatDurationSec } from '@renderer/lib/format'
import { useRangeStore, windowFor } from '@renderer/state/rangeStore'
import { useFilteredAggregates } from '@renderer/state/useFilteredAggregates'
import { useMemo } from 'react'

/**
 * Overview — landing page. KPI strip on top, Activity area chart below.
 *
 * "When you record" + "Duration mix" used to live here too; in wave 5 they
 * moved to Usage where the recording-cadence story belongs. A 6-card KPI
 * grid (with period-over-period comparison) replaces this strip in the
 * follow-up PR.
 *
 * Range-aware: every aggregate flows through `useFilteredAggregates`, so
 * KPIs + Activity all respect the navbar's date pill in lockstep.
 */
export function Overview(): React.JSX.Element {
  const { overview, daily, sparklines } = useFilteredAggregates()
  const avgPerRec =
    overview.totalRecordings > 0 ? Math.round(overview.totalWords / overview.totalRecordings) : 0
  const range = useRangeStore((s) => s.range)
  const { from, to } = useMemo(() => windowFor(range), [range])

  return (
    <div className="flex h-full flex-col gap-3">
      <KpiRow
        items={[
          {
            label: 'Recordings',
            value: formatCompact(overview.totalRecordings),
            sub: `${overview.activeDays} active days`,
            spark: sparklines.recordings.values
          },
          {
            label: 'Total words',
            value: formatCompact(overview.totalWords),
            sub: `${avgPerRec} avg / recording`,
            spark: sparklines.words.values
          },
          {
            label: 'Time spoken',
            value: formatDurationSec(overview.totalDurationSec),
            sub: `${formatDurationSec(overview.avgDurationSec)} avg`,
            spark: sparklines.duration.values
          },
          {
            label: 'Words / minute',
            value: String(overview.avgWPM),
            sub: 'rolling average',
            spark: sparklines.wpm.values
          }
        ]}
      />

      <ChartCard title="Activity" slug="activity" className="min-h-0 flex-1">
        <ActivityArea
          data={daily as unknown as Array<Record<string, unknown>>}
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
