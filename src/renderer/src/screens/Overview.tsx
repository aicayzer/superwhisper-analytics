import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { DistBar } from '@renderer/components/charts/DistBar'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatActivityTick, formatCompact, formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import { useRangeStore, windowFor } from '@renderer/state/rangeStore'
import { useMemo } from 'react'

/**
 * Overview — landing page. Three rows:
 *   1. KPI strip
 *   2. "When you record" heatmap (3/5) + Duration mix bar (2/5)
 *   3. Activity area chart filling the rest, scoped to the navbar's
 *      selected range.
 */
export function Overview(): React.JSX.Element {
  const { overview, daily, heatmap, durationDist, sparklines } = mock
  const avgPerRec = Math.round(overview.totalWords / overview.totalRecordings)
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

      {/* Row 2: heatmap (3/5) + duration mix (2/5). Both share a fixed
          height so they stay readable as the window grows; the Activity
          row underneath flexes. */}
      <div className="grid grid-cols-[3fr_2fr] gap-3" style={{ height: 240 }}>
        <ChartCard title="When you record" slug="when-you-record">
          <div className="flex h-full flex-col justify-center">
            <Heatmap matrix={heatmap} cellHeight={20} />
          </div>
        </ChartCard>
        <ChartCard title="Duration mix" slug="duration-mix">
          <DistBar
            data={durationDist as unknown as Array<Record<string, unknown>>}
            xKey="label"
            yKey="count"
          />
        </ChartCard>
      </div>

      {/* Row 3: Activity. Filters by the navbar range so the chart
          reflects the user's chosen window. */}
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
