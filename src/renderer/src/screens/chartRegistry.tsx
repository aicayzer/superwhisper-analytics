import {
  ActivityChart,
  ByDayOfWeekChart,
  DurationMixChart,
  FillerRateChart,
  FillerWordsChart,
  ModePieChart,
  RecordingStreakChart,
  SentenceLengthChart,
  SpeakingPaceChart,
  TopWordsChart,
  VocabularyGrowthChart,
  VolumeOverTimeChart,
  WhenYouRecordChart
} from './chartItems'

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
 * link, by ChartView for the full-screen render, and by the command
 * palette's Navigation group (so Cmd-K → "Top words" jumps straight in).
 *
 * Adding a chart anywhere means adding it here too — keeps the breadcrumb
 * path consistent and the palette autocomplete current.
 *
 * Each `render()` returns a small named component (defined in
 * `./chartItems`) rather than an inline lambda that calls hooks — inline-
 * lambda hooks would violate rules of hooks when navigating between
 * `/chart/:slug` paths.
 */
export const CHART_REGISTRY: Record<string, ChartSpec> = {
  'volume-over-time': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Volume over time',
    description: 'Recordings per day across the active range.',
    render: () => <VolumeOverTimeChart />
  },
  'when-you-record': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'When you record',
    description: 'Day of week × hour of day. Brighter cells are busier.',
    render: () => <WhenYouRecordChart />
  },
  'recording-streak': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Recording streak',
    description: 'Daily activity across the selected range.',
    render: () => <RecordingStreakChart />
  },
  'duration-mix': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Duration mix',
    description: 'How long recordings tend to run.',
    render: () => <DurationMixChart />
  },
  'mode-pie': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Mode share',
    description: 'Share of recordings by mode.',
    render: () => <ModePieChart />
  },
  'top-words': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Top words',
    render: () => <TopWordsChart />
  },
  'filler-words': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Filler words',
    render: () => <FillerWordsChart />
  },
  'speaking-pace': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Words per minute',
    description: 'Average over the selected range, plotted over per-recording dots.',
    render: () => <SpeakingPaceChart />
  },
  'filler-rate': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Filler rate',
    render: () => <FillerRateChart />
  },
  'sentence-length': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Sentence length',
    render: () => <SentenceLengthChart />
  },
  'vocabulary-growth': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Vocabulary growth',
    description: 'Cumulative unique words used.',
    render: () => <VocabularyGrowthChart />
  },
  activity: {
    section: 'Overview',
    sectionPath: '/',
    title: 'Activity',
    description: 'Recordings per day.',
    render: () => <ActivityChart />
  },
  'by-day-of-week': {
    section: 'Overview',
    sectionPath: '/',
    title: 'By day of week',
    render: () => <ByDayOfWeekChart />
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
