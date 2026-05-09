import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { DistBar } from '@renderer/components/charts/DistBar'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { HourRadial } from '@renderer/components/charts/HourRadial'
import { StreakCalendar } from '@renderer/components/charts/StreakCalendar'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'

export function Usage(): React.JSX.Element {
  const { overview, usage, daily, hourly, heatmap, durationDist, sparklines, streakCells } = mock

  return (
    <div className="space-y-3">
      <KpiRow
        items={[
          {
            label: 'Active days',
            value: String(overview.activeDays),
            sub: `of ${daily.length} in window`,
            spark: sparklines.recordings.values
          },
          {
            label: 'Current streak',
            value: `${usage.currentStreak}d`,
            sub: `longest ${usage.longestStreak}d`
          },
          {
            label: 'Avg per active day',
            value: String(Math.round(usage.avgPerActiveDay)),
            sub: 'recordings',
            spark: sparklines.recordings.values
          },
          {
            label: 'Time per day',
            value: formatDurationSec(usage.timePerActiveDaySec),
            sub: 'active days',
            spark: sparklines.duration.values
          }
        ]}
      />

      <ChartCard title="Recording streak" slug="recording-streak" className="h-[160px]">
        <StreakCalendar data={streakCells} />
      </ChartCard>

      <ChartCard title="Volume over time" slug="volume-over-time" className="h-[260px]">
        <ActivityArea
          data={daily as unknown as Array<Record<string, unknown>>}
          xKey="date"
          yKey="count"
          formatTick={(v) => {
            const d = new Date(String(v))
            return isNaN(d.getTime())
              ? ''
              : d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
          }}
        />
      </ChartCard>

      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3" style={{ height: 240 }}>
        <ChartCard title="When you record" slug="when-you-record">
          <Heatmap matrix={heatmap} cellHeight={20} />
        </ChartCard>
        <ChartCard title="By hour of day" slug="by-hour-of-day">
          <HourRadial data={hourly} />
        </ChartCard>
        <ChartCard title="Duration mix" slug="duration-mix">
          <DistBar
            data={durationDist as unknown as Array<Record<string, unknown>>}
            xKey="label"
            yKey="count"
          />
        </ChartCard>
      </div>
    </div>
  )
}
