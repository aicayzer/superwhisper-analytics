import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { DistBar } from '@renderer/components/charts/DistBar'
import { HBar } from '@renderer/components/charts/HBar'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { HourRadial } from '@renderer/components/charts/HourRadial'
import { LineTrend } from '@renderer/components/charts/LineTrend'
import { StreakCalendar } from '@renderer/components/charts/StreakCalendar'
import { VBar } from '@renderer/components/charts/VBar'
import { mock } from '@renderer/lib/mock'

export interface ChartSpec {
  /** Section breadcrumb (e.g. "Usage", "Language", "Overview"). */
  section: string
  /** Title — used both as breadcrumb tail and full-screen heading. */
  title: string
  /** Optional human-friendly subtext shown above the chart. */
  description?: string
  /** Pathname of the screen this chart lives on (used as breadcrumb link). */
  sectionPath: string
  /** Render the chart filling its parent. */
  render: () => React.JSX.Element
}

/**
 * Single source of truth mapping slug → chart. Used by ChartCard's maximise
 * link and by ChartView for the full-screen render. Adding a chart anywhere
 * means adding it here too — keeps the breadcrumb path consistent.
 */
export const CHART_REGISTRY: Record<string, ChartSpec> = {
  'volume-over-time': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Volume over time',
    description: 'Recordings per day across the active range.',
    render: () => (
      <ActivityArea
        data={mock.daily as unknown as Array<Record<string, unknown>>}
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
  },
  'when-you-record': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'When you record',
    description: 'Day of week × hour of day. Brighter cells are busier.',
    render: () => <Heatmap matrix={mock.heatmap} cellHeight={36} />
  },
  'recording-streak': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Recording streak',
    description: 'Daily activity for the last twelve months.',
    render: () => (
      <div className="flex h-full items-center justify-center overflow-auto">
        <StreakCalendar data={mock.streakCells} cellSize={16} />
      </div>
    )
  },
  'by-hour-of-day': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'By hour of day',
    render: () => <HourRadial data={mock.hourly} />
  },
  'duration-mix': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Duration mix',
    render: () => (
      <DistBar
        data={mock.durationDist as unknown as Array<Record<string, unknown>>}
        xKey="label"
        yKey="count"
      />
    )
  },
  'top-words': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Top words',
    render: () => (
      <HBar
        data={mock.wordFrequency.slice(0, 24).map((w) => ({ label: w.word, count: w.count }))}
        xKey="count"
        yKey="label"
      />
    )
  },
  'filler-words': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Filler words',
    render: () => (
      <HBar
        data={mock.fillerSummary.slice(0, 12).map((f) => ({ label: f.phrase, count: f.count }))}
        xKey="count"
        yKey="label"
      />
    )
  },
  'speaking-pace': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Speaking pace',
    description: 'Words per minute, monthly average.',
    render: () => (
      <LineTrend
        data={mock.wpmTrend as unknown as Array<Record<string, unknown>>}
        xKey="period"
        yKey="value"
        reference={{ value: 140, label: '140' }}
        formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
      />
    )
  },
  'filler-rate': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Filler rate over time',
    render: () => (
      <LineTrend
        data={mock.fillerTrend as unknown as Array<Record<string, unknown>>}
        xKey="period"
        yKey="value"
        formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
      />
    )
  },
  'sentence-length': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Sentence length',
    render: () => (
      <DistBar
        data={mock.sentenceDist as unknown as Array<Record<string, unknown>>}
        xKey="label"
        yKey="count"
      />
    )
  },
  'vocabulary-growth': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Vocabulary growth',
    description: 'Cumulative unique words used.',
    render: () => (
      <ActivityArea
        data={mock.vocabGrowth as unknown as Array<Record<string, unknown>>}
        xKey="period"
        yKey="value"
        formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
      />
    )
  },
  activity: {
    section: 'Overview',
    sectionPath: '/',
    title: 'Activity',
    description: 'Recordings per day.',
    render: () => (
      <ActivityArea
        data={mock.daily as unknown as Array<Record<string, unknown>>}
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
  },
  'by-day-of-week': {
    section: 'Overview',
    sectionPath: '/',
    title: 'By day of week',
    render: () => (
      <VBar
        data={mock.dayOfWeek as unknown as Array<Record<string, unknown>>}
        xKey="dayName"
        yKey="count"
      />
    )
  }
}

/** Turn a slug into a breadcrumb if it's a known chart. */
export function chartBreadcrumb(
  slug: string | undefined
): { section: string; sectionPath: string; title: string } | null {
  if (!slug) return null
  const spec = CHART_REGISTRY[slug]
  if (!spec) return null
  return { section: spec.section, sectionPath: spec.sectionPath, title: spec.title }
}
