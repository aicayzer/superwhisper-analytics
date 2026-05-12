import { ChartCard } from '@renderer/components/charts/ChartCard'
import { DistBar } from '@renderer/components/charts/DistBar'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { ModePie } from '@renderer/components/charts/ModePie'
import { StreakCalendar } from '@renderer/components/charts/StreakCalendar'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatDurationSec } from '@renderer/lib/format'
import { useRangeStore, windowFor } from '@renderer/state/rangeStore'
import { useFilteredAggregates } from '@renderer/state/useFilteredAggregates'
import { useMemo } from 'react'

/**
 * Usage — recording cadence + mode breakdown.
 *
 * Final layout — 2×2 with asymmetric column ratios so each chart gets the
 * aspect that fits it best:
 *
 *   ┌──────────────────────────┬──────────────────┐
 *   │  Recordings by hour 3fr  │  by duration 2fr │
 *   │  (hour × day heatmap)    │  (distribution)  │
 *   ├──────────────────────────┴──────────────────┤
 *   │  Daily activity 2fr      │  by mode 1fr     │
 *   │  (year of days, calendar)│  (donut)         │
 *   └─────────────────────────────────────────────┘
 *
 * The bottom row is two-thirds / one-third so the year-grid calendar
 * (which reads best wide) gets the real estate while the donut keeps
 * just enough room for its outside labels + leader lines.
 *
 * Every aggregate flows through `useFilteredAggregates`, so the cards
 * update with the navbar range pill.
 */
export function Usage(): React.JSX.Element {
  const { overview, usage, heatmap, durationDist, modeStats, sparklines, streakCells } =
    useFilteredAggregates()
  const range = useRangeStore((s) => s.range)
  // The streak calendar wants to know which days are inside the active
  // range so it can shade them. Range = "All time" returns {} — pass
  // undefined to the calendar in that case and every cell renders at
  // full intensity.
  const { from: rangeFrom, to: rangeTo } = useMemo(() => windowFor(range), [range])

  const modePieData = useMemo(
    () => modeStats.map((m) => ({ name: m.modeName, value: m.count })),
    [modeStats]
  )

  return (
    <div className="grid h-full grid-rows-[auto_1fr_1fr] gap-3">
      <KpiRow
        items={[
          {
            label: 'Active days',
            value: String(overview.activeDays),
            spark: sparklines.recordings.values
          },
          {
            label: 'Current streak',
            value: `${usage.currentStreak}d`
          },
          {
            label: 'Recordings per day',
            value: String(Math.round(usage.avgPerActiveDay)),
            spark: sparklines.recordings.values
          },
          {
            label: 'Time per day',
            value: formatDurationSec(usage.timePerActiveDaySec),
            spark: sparklines.duration.values
          }
        ]}
      />

      {/* Top row — Recordings by hour (3fr) + Recordings by duration (2fr). */}
      <div className="grid min-h-0 grid-cols-[3fr_2fr] gap-3">
        <ChartCard title="Recordings by hour" slug="when-you-record">
          <Heatmap matrix={heatmap} />
        </ChartCard>
        <ChartCard title="Recordings by duration" slug="duration-mix" className="min-w-[260px]">
          <DistBar data={durationDist} xKey="label" yKey="count" />
        </ChartCard>
      </div>

      {/* Bottom row — Recordings by mode (1fr) on the left, Daily activity
          (2fr) on the right. Donut takes the smaller slot so the calendar
          gets the horizontal real estate that suits it. */}
      <div className="grid min-h-0 grid-cols-[1fr_2fr] gap-3">
        <ChartCard title="Recordings by mode" slug="mode-pie" className="min-w-[240px]">
          <ModePie data={modePieData} />
        </ChartCard>
        <ChartCard title="Daily activity" slug="recording-streak">
          <StreakCalendar data={streakCells} rangeFrom={rangeFrom} rangeTo={rangeTo} />
        </ChartCard>
      </div>
    </div>
  )
}
