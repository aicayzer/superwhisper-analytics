import { ChartCard } from '@renderer/components/charts/ChartCard'
import { DistBar } from '@renderer/components/charts/DistBar'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { ModePie } from '@renderer/components/charts/ModePie'
import { StreakCalendar } from '@renderer/components/charts/StreakCalendar'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatDurationSec } from '@renderer/lib/format'
import { useFilteredAggregates } from '@renderer/state/useFilteredAggregates'
import { useMemo } from 'react'

/**
 * Usage — recording cadence + mode breakdown.
 *
 * Final layout — 2×2 with asymmetric column ratios so each chart gets the
 * aspect that fits it best:
 *
 *   ┌──────────────────────────┬──────────────────┐
 *   │  When you record (3/5)   │  Mode share (2/5)│
 *   │  (hour × day heatmap)    │  (pie)           │
 *   ├──────────────────┬───────┴──────────────────┤
 *   │  Duration mix    │  Streak calendar (3/5)   │
 *   │  (2/5, square)   │  (year of days, github)  │
 *   └──────────────────┴──────────────────────────┘
 *
 * Top row is "rectangular left, square right". Bottom flips that —
 * a more square duration chart sits beside the wide streak calendar.
 * Every aggregate flows through `useFilteredAggregates`, so the cards
 * update with the navbar range pill.
 */
export function Usage(): React.JSX.Element {
  const { overview, usage, daily, heatmap, durationDist, modeStats, sparklines, streakCells } =
    useFilteredAggregates()

  const modePieData = useMemo(
    () => modeStats.map((m) => ({ name: m.modeName, value: m.count })),
    [modeStats]
  )
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

      {/* Top row — When you record (3/5) + Mode share (2/5). */}
      <div className="grid min-h-0 flex-1 grid-cols-[3fr_2fr] gap-3">
        <ChartCard title="When you record" slug="when-you-record">
          <div className="flex h-full flex-col justify-center">
            <Heatmap matrix={heatmap} cellHeight={24} />
          </div>
        </ChartCard>
        <ChartCard title="Mode share" slug="mode-pie">
          <ModePie
            data={modePieData}
            centreLabel={dominantMode?.modeName}
            centreSubLabel={dominantMode ? `${dominantPct}%` : undefined}
          />
        </ChartCard>
      </div>

      {/* Bottom row — Duration mix (2/5, more square) + Streak calendar
          (3/5, wide GitHub-style year grid). */}
      <div className="grid min-h-0 flex-1 grid-cols-[2fr_3fr] gap-3">
        <ChartCard title="Duration mix" slug="duration-mix">
          <DistBar data={durationDist} xKey="label" yKey="count" />
        </ChartCard>
        <ChartCard title="Recording streak" slug="recording-streak">
          <StreakCalendar data={streakCells} />
        </ChartCard>
      </div>
    </div>
  )
}
