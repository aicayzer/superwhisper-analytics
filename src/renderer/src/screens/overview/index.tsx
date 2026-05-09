import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { StackedAreaPercent } from '@renderer/components/charts/StackedAreaPercent'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatCompact, formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import { formatActivityTick } from './format'

/**
 * Overview — landing page. KPI strip → Activity + Mode mix → "When you record"
 * heatmap fills the rest of the viewport.
 */
export function Overview(): React.JSX.Element {
  const { overview, daily, heatmap, modeByWeekFlat, stackModeKeys, sparklines } = mock
  const avgPerRec = Math.round(overview.totalWords / overview.totalRecordings)

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

      <div className="grid grid-cols-[3fr_2fr] gap-3" style={{ height: 240 }}>
        <ChartCard title="Activity" slug="activity">
          <ActivityArea
            data={daily as unknown as Array<Record<string, unknown>>}
            xKey="date"
            yKey="count"
            formatTick={formatActivityTick}
          />
        </ChartCard>
        <ChartCard title="Mode mix" slug="mode-mix">
          <StackedAreaPercent
            data={modeByWeekFlat}
            xKey="date"
            keys={stackModeKeys}
            formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
          />
        </ChartCard>
      </div>

      <ChartCard title="When you record" slug="when-you-record" className="min-h-0 flex-1">
        <div className="flex h-full flex-col justify-center">
          <Heatmap matrix={heatmap} cellHeight={28} />
        </div>
      </ChartCard>
    </div>
  )
}
