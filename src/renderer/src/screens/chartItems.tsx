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
import { useDataStore } from '@renderer/state/dataStore'

/**
 * One small data-bound component per chart in the registry.
 *
 * Lives in a separate file so chartRegistry.tsx can keep its
 * `CHART_REGISTRY` constant + ChartSpec type + chartBreadcrumb helper
 * exports without tripping react-refresh/only-export-components.
 */

export function VolumeOverTimeChart(): React.JSX.Element {
  const daily = useDataStore((s) => s.daily)
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
  const heatmap = useDataStore((s) => s.heatmap)
  return <Heatmap matrix={heatmap} cellHeight={36} />
}

export function RecordingStreakChart(): React.JSX.Element {
  const streakCells = useDataStore((s) => s.streakCells)
  return (
    <div className="flex h-full items-center justify-center overflow-auto">
      <StreakCalendar data={streakCells} cellSize={16} />
    </div>
  )
}

export function ByHourOfDayChart(): React.JSX.Element {
  const hourly = useDataStore((s) => s.hourly)
  return <HourRadial data={hourly} />
}

export function DurationMixChart(): React.JSX.Element {
  const durationDist = useDataStore((s) => s.durationDist)
  return (
    <DistBar
      data={durationDist as unknown as Array<Record<string, unknown>>}
      xKey="label"
      yKey="count"
    />
  )
}

export function ModePieChart(): React.JSX.Element {
  const modeStats = useDataStore((s) => s.modeStats)
  const totalRecordings = useDataStore((s) => s.overview.totalRecordings)
  const data = modeStats.map((m) => ({ name: m.modeName, value: m.count }))
  const dom = modeStats[0]
  const pct = dom && totalRecordings > 0 ? Math.round((dom.count / totalRecordings) * 100) : 0
  return (
    <ModePie data={data} centreLabel={dom?.modeName} centreSubLabel={dom ? `${pct}%` : undefined} />
  )
}

export function WpmByModeChart(): React.JSX.Element {
  const wpmByMode = useDataStore((s) => s.wpmByMode)
  return (
    <HBar
      data={wpmByMode.map((w) => ({ label: w.mode, count: w.avgWPM }))}
      xKey="count"
      yKey="label"
      labelWidth={120}
    />
  )
}

export function TopWordsChart(): React.JSX.Element {
  const wordFrequency = useDataStore((s) => s.wordFrequency)
  return (
    <HBar
      data={wordFrequency.slice(0, 100).map((w) => ({ label: w.word, count: w.count }))}
      xKey="count"
      yKey="label"
    />
  )
}

export function FillerWordsChart(): React.JSX.Element {
  const fillerSummary = useDataStore((s) => s.fillerSummary)
  return (
    <HBar
      data={fillerSummary.slice(0, 50).map((f) => ({ label: f.phrase, count: f.count }))}
      xKey="count"
      yKey="label"
    />
  )
}

export function SpeakingPaceChart(): React.JSX.Element {
  const wpmTrend = useDataStore((s) => s.wpmTrend)
  const wpmDots = useDataStore((s) => s.wpmDots)
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
  const fillerTrend = useDataStore((s) => s.fillerTrend)
  return (
    <LineTrend
      data={fillerTrend as unknown as Array<Record<string, unknown>>}
      xKey="period"
      yKey="value"
      formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
    />
  )
}

export function SentenceLengthChart(): React.JSX.Element {
  const sentenceDist = useDataStore((s) => s.sentenceDist)
  return (
    <DistBar
      data={sentenceDist as unknown as Array<Record<string, unknown>>}
      xKey="label"
      yKey="count"
    />
  )
}

export function VocabularyGrowthChart(): React.JSX.Element {
  const vocabGrowth = useDataStore((s) => s.vocabGrowth)
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
  const daily = useDataStore((s) => s.daily)
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
  const dayOfWeek = useDataStore((s) => s.dayOfWeek)
  return (
    <VBar
      data={dayOfWeek as unknown as Array<Record<string, unknown>>}
      xKey="dayName"
      yKey="count"
    />
  )
}
