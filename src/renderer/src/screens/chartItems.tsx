import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { DistBar } from '@renderer/components/charts/DistBar'
import { HBar } from '@renderer/components/charts/HBar'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { HourRadial } from '@renderer/components/charts/HourRadial'
import { LineTrend } from '@renderer/components/charts/LineTrend'
import { ModePie } from '@renderer/components/charts/ModePie'
import { PaceTrend } from '@renderer/components/charts/PaceTrend'
import { StreakCalendar } from '@renderer/components/charts/StreakCalendar'
import { VBar } from '@renderer/components/charts/VBar'
import { useFilteredAggregates } from '@renderer/state/useFilteredAggregates'
import { useMemo } from 'react'

/**
 * One small data-bound component per chart in the registry.
 *
 * Lives in a separate file so chartRegistry.tsx can keep its
 * `CHART_REGISTRY` constant + ChartSpec type + chartBreadcrumb helper
 * exports without tripping react-refresh/only-export-components.
 *
 * Every chart reads from `useFilteredAggregates()` so the full-screen view
 * respects the navbar's date pill the same way the home cards do.
 */

export function VolumeOverTimeChart(): React.JSX.Element {
  const { daily } = useFilteredAggregates()
  return (
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
  )
}

export function WhenYouRecordChart(): React.JSX.Element {
  const { heatmap } = useFilteredAggregates()
  return <Heatmap matrix={heatmap} cellHeight={36} />
}

export function RecordingStreakChart(): React.JSX.Element {
  const { streakCells } = useFilteredAggregates()
  return (
    <div className="flex h-full items-center justify-center overflow-auto">
      <StreakCalendar data={streakCells} cellSize={16} />
    </div>
  )
}

export function ByHourOfDayChart(): React.JSX.Element {
  const { hourly } = useFilteredAggregates()
  return <HourRadial data={hourly} />
}

export function DurationMixChart(): React.JSX.Element {
  const { durationDist } = useFilteredAggregates()
  return (
    <DistBar
      data={durationDist as unknown as Array<Record<string, unknown>>}
      xKey="label"
      yKey="count"
    />
  )
}

export function ModePieChart(): React.JSX.Element {
  const { modeStats, overview } = useFilteredAggregates()
  const data = useMemo(
    () => modeStats.map((m) => ({ name: m.modeName, value: m.count })),
    [modeStats]
  )
  const dom = modeStats[0]
  const pct =
    dom && overview.totalRecordings > 0
      ? Math.round((dom.count / overview.totalRecordings) * 100)
      : 0
  return (
    <ModePie data={data} centreLabel={dom?.modeName} centreSubLabel={dom ? `${pct}%` : undefined} />
  )
}

export function WpmByModeChart(): React.JSX.Element {
  const { wpmByMode } = useFilteredAggregates()
  const data = useMemo(
    () => wpmByMode.map((w) => ({ label: w.mode, count: w.avgWPM })),
    [wpmByMode]
  )
  return <HBar data={data} xKey="count" yKey="label" labelWidth={120} />
}

export function TopWordsChart(): React.JSX.Element {
  const { wordFrequency } = useFilteredAggregates()
  const data = useMemo(
    () => wordFrequency.slice(0, 100).map((w) => ({ label: w.word, count: w.count })),
    [wordFrequency]
  )
  return <HBar data={data} xKey="count" yKey="label" />
}

export function FillerWordsChart(): React.JSX.Element {
  const { fillerSummary } = useFilteredAggregates()
  const data = useMemo(
    () => fillerSummary.slice(0, 50).map((f) => ({ label: f.phrase, count: f.count })),
    [fillerSummary]
  )
  return <HBar data={data} xKey="count" yKey="label" />
}

export function SpeakingPaceChart(): React.JSX.Element {
  const { wpmTrend, wpmDots } = useFilteredAggregates()
  return (
    <PaceTrend
      trend={wpmTrend as unknown as Array<Record<string, unknown>>}
      dots={wpmDots}
      xKey="period"
      yKey="value"
      reference={{ value: 140, label: '140' }}
      formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
    />
  )
}

export function FillerRateChart(): React.JSX.Element {
  const { fillerTrend } = useFilteredAggregates()
  return (
    <LineTrend
      data={fillerTrend as unknown as Array<Record<string, unknown>>}
      xKey="period"
      yKey="value"
      formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
      formatYTick={(v) => `${v}%`}
    />
  )
}

export function SentenceLengthChart(): React.JSX.Element {
  const { sentenceDist } = useFilteredAggregates()
  return (
    <DistBar
      data={sentenceDist as unknown as Array<Record<string, unknown>>}
      xKey="label"
      yKey="count"
    />
  )
}

export function VocabularyGrowthChart(): React.JSX.Element {
  const { vocabGrowth } = useFilteredAggregates()
  return (
    <ActivityArea
      data={vocabGrowth as unknown as Array<Record<string, unknown>>}
      xKey="period"
      yKey="value"
      formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
    />
  )
}

export function ActivityChart(): React.JSX.Element {
  const { daily } = useFilteredAggregates()
  return (
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
  )
}

export function ByDayOfWeekChart(): React.JSX.Element {
  const { dayOfWeek } = useFilteredAggregates()
  return (
    <VBar
      data={dayOfWeek as unknown as Array<Record<string, unknown>>}
      xKey="dayName"
      yKey="count"
    />
  )
}
