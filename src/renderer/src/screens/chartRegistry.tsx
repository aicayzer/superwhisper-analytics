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
    title: 'Recordings over time',
    description: 'How many recordings you made each day, across the selected range.',
    render: () => <VolumeOverTimeChart />
  },
  'when-you-record': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Recordings by hour',
    description: 'When you tend to record, broken down by day of week and hour of day.',
    render: () => <WhenYouRecordChart />
  },
  'recording-streak': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Daily activity',
    description: 'A calendar view of your recording activity over the past few months.',
    render: () => <RecordingStreakChart />
  },
  'duration-mix': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Recordings by duration',
    description: 'How your recording lengths are distributed across the selected range.',
    render: () => <DurationMixChart />
  },
  'mode-pie': {
    section: 'Usage',
    sectionPath: '/usage',
    title: 'Recordings by mode',
    description: 'Which SuperWhisper modes you use the most.',
    render: () => <ModePieChart />
  },
  'top-words': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Top words',
    description: 'Your most frequently spoken words across the selected range.',
    render: () => <TopWordsChart />
  },
  'filler-words': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Top fillers',
    description: 'Your most-used filler words and hesitations across the selected range.',
    render: () => <FillerWordsChart />
  },
  'speaking-pace': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Words per minute',
    description: 'Your speaking pace over time, with one dot per recording.',
    render: () => <SpeakingPaceChart />
  },
  'filler-rate': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Filler rate',
    description: 'The share of your spoken words that are fillers, over time.',
    render: () => <FillerRateChart />
  },
  'sentence-length': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Sentence length',
    description: 'How long your sentences tend to be, in words.',
    render: () => <SentenceLengthChart />
  },
  'vocabulary-growth': {
    section: 'Language',
    sectionPath: '/language',
    title: 'Vocabulary growth',
    description: 'The total number of unique words you have used, growing over time.',
    render: () => <VocabularyGrowthChart />
  },
  activity: {
    section: 'Overview',
    sectionPath: '/',
    title: 'Recordings over time',
    description: 'How many recordings you made each day, across the selected range.',
    render: () => <ActivityChart />
  },
  'by-day-of-week': {
    section: 'Overview',
    sectionPath: '/',
    title: 'Recordings by day of week',
    description: 'Which days of the week you record on most.',
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
