import { ChartCard } from '@renderer/components/charts/ChartCard'
import { HBar } from '@renderer/components/charts/HBar'
import { HourRadial } from '@renderer/components/charts/HourRadial'
import { ModePie } from '@renderer/components/charts/ModePie'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'

/**
 * Usage — recording cadence + mode breakdown.
 *
 * Layout (post wave-4 polish):
 *
 *   ┌─────────────────────┬─────────────────────┐
 *   │                     │   Mode share        │
 *   │  By hour of day     ├─────────────────────┤
 *   │  (full height)      │   WPM by mode       │
 *   └─────────────────────┴─────────────────────┘
 *
 * The hour-of-day clock is the single most-information-dense view of
 * the dataset; it earns the full height. Mode share + WPM-by-mode
 * stack on the right because each is a small categorical breakdown
 * that fits comfortably in half a column.
 */
export function Usage(): React.JSX.Element {
  const { overview, usage, daily, hourly, modeStats, sparklines, wpmByMode } = mock

  const modePieData = modeStats.map((m) => ({ name: m.modeName, value: m.count }))
  const dominantMode = modeStats[0]
  const dominantPct = dominantMode
    ? Math.round((dominantMode.count / overview.totalRecordings) * 100)
    : 0

  const wpmBarData = wpmByMode.map((w) => ({ label: w.mode, count: w.avgWPM }))

  return (
    <div className="flex h-full flex-col gap-3">
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

      {/* Three-panel grid: HourRadial fills the left column at full height;
          right column splits into Mode share + WPM by mode. min-h-0 so the
          inner ResponsiveContainers actually receive a height. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="By hour of day" slug="by-hour-of-day">
          <HourRadial data={hourly} />
        </ChartCard>
        <div className="grid min-h-0 grid-rows-2 gap-3">
          <ChartCard title="Mode share" slug="mode-pie">
            <ModePie
              data={modePieData}
              centreLabel={dominantMode?.modeName}
              centreSubLabel={dominantMode ? `${dominantPct}%` : undefined}
            />
          </ChartCard>
          <ChartCard title="WPM by mode" slug="wpm-by-mode">
            <HBar data={wpmBarData} xKey="count" yKey="label" labelWidth={96} />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
