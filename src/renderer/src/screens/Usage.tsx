import { ChartCard } from '@renderer/components/charts/ChartCard'
import { HourRadial } from '@renderer/components/charts/HourRadial'
import { ModePie } from '@renderer/components/charts/ModePie'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'

/**
 * Usage — recording cadence + mode breakdown. Two rows:
 *   1. KPI strip (active days, current/longest streak, avg per active day,
 *      time per active day).
 *   2. By-hour-of-day radial (left) + Mode share donut (right). Both
 *      flex to fill remaining viewport — no scroll.
 *
 * StreakCalendar moved out (still available via chart full-screen view if
 * needed); the day×hour heatmap and duration distribution live on the
 * Overview now.
 */
export function Usage(): React.JSX.Element {
  const { overview, usage, daily, hourly, modeStats, sparklines } = mock

  const modePieData = modeStats.map((m) => ({ name: m.modeName, value: m.count }))
  const dominantMode = modeStats[0]
  const dominantPct = dominantMode
    ? Math.round((dominantMode.count / overview.totalRecordings) * 100)
    : 0

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

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="By hour of day" slug="by-hour-of-day">
          <HourRadial data={hourly} />
        </ChartCard>
        <ChartCard title="Mode share" slug="mode-pie">
          <ModePie
            data={modePieData}
            centreLabel={dominantMode?.modeName}
            centreSubLabel={dominantMode ? `${dominantPct}%` : undefined}
          />
        </ChartCard>
      </div>
    </div>
  )
}
