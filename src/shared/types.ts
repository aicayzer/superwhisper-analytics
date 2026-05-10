/**
 * Canonical shapes shared between main and renderer.
 *
 * Main (`src/main/scanner.ts`, `src/main/aggregates.ts`) produces these.
 * Renderer (`src/renderer/src/lib/data.ts` and the screens it feeds)
 * consumes them. Same file, two `tsconfig` `include`s — the
 * `@shared/*` path alias resolves identically for both processes.
 *
 * Add a new aggregate shape here, plumb a `compute*` for it in
 * `aggregates.ts`, expose it on `Aggregates`, and the renderer picks it
 * up via the `useDataStore` selector.
 */

export interface Segment {
  start: number // seconds
  end: number // seconds
  text: string
}

export interface Recording {
  id: string // unix timestamp string ("1755164573") — the recording folder name
  datetime: string // ISO without timezone, as SuperWhisper stores it
  modeName: string
  modelName: string
  appVersion: string
  recordingDevice: string
  languageSelected: string
  duration: number // ms
  processingTime: number // ms
  result: string // processed transcript
  rawResult: string // raw transcript
  segments: Segment[]
  // Derived metrics — recomputed by analytics, kept on the object for convenience
  wordCount: number
  wordsPerMinute: number
  sentenceCount: number
  fillerCount: number
  fillerBreakdown: Array<{ phrase: string; count: number }>
  excerpt: string
  /**
   * Optional pre-computed peaks. Real recordings don't ship these — the
   * renderer decodes them lazily from the WAV file via Web Audio API.
   * Mock data populates the field for back-compat with legacy tests.
   */
  waveform?: number[]
}

export interface OverviewStats {
  totalRecordings: number
  totalWords: number
  totalDurationSec: number
  avgWPM: number
  avgDurationSec: number
  dateRange: { start: string; end: string }
  activeDays: number
}

export interface DailySummary {
  date: string // YYYY-MM-DD
  count: number
  totalWords: number
  totalDurationSec: number
}

export interface DayOfWeekPattern {
  day: number // 0 = Mon, 6 = Sun (Mon-first across the app — see aggregates.ts)
  dayName: string
  count: number
}

export interface ModeStat {
  modeName: string
  count: number
  totalWords: number
  totalDurationSec: number
  pct: number
}

export interface WordFrequency {
  word: string
  count: number
}

export interface DurationBucket {
  label: string
  min: number // seconds, inclusive
  max: number // seconds, exclusive (Infinity for last bucket)
  count: number
}

export interface SentenceBucket {
  label: string
  min: number // words/sentence, inclusive
  max: number // exclusive
  count: number
}

export interface TrendPoint {
  period: string // YYYY-MM or YYYY-Www
  value: number
}

export interface UsageStats {
  currentStreak: number
  longestStreak: number
  avgPerActiveDay: number
  timePerActiveDaySec: number
}

export interface LanguageStats {
  avgWPM: number
  fillerRatePct: number
  vocabularyCount: number
  avgSentenceLength: number
}

/** 7×24 number matrix — rows are days (0=Mon, Mon-first), cols are hours. */
export type Heatmap = number[][]

/** Single cell of the GitHub-style streak calendar. */
export interface StreakCell {
  date: string // YYYY-MM-DD
  count: number
}

/** A KPI's trailing series — used by the inline sparkline. */
export interface SparkSeries {
  values: number[] // oldest → newest
  labels?: string[]
}

/** Per-day breakdown of recordings by mode, for stacked-area / bar charts. */
export interface ModeByDay {
  date: string // YYYY-MM-DD
  modes: Record<string, number>
}

/**
 * The full bundle of aggregates the data store exposes.
 *
 * Add a new aggregate shape: declare its interface above, plumb a
 * `compute*` helper in `aggregates.ts`, surface it on `Aggregates`, and
 * the renderer reads it via `useFilteredAggregates()` (or `dataStore`).
 */
export interface Aggregates {
  overview: OverviewStats
  daily: DailySummary[]
  dayOfWeek: DayOfWeekPattern[]
  modeStats: ModeStat[]
  wordFrequency: WordFrequency[]
  fillerSummary: Array<{ phrase: string; count: number }>
  heatmap: Heatmap
  durationDist: DurationBucket[]
  usage: UsageStats
  wpmTrend: TrendPoint[]
  fillerTrend: TrendPoint[]
  sentenceDist: SentenceBucket[]
  vocabGrowth: TrendPoint[]
  language: LanguageStats
  sparklines: Record<'recordings' | 'words' | 'duration' | 'wpm', SparkSeries>
  streakCells: StreakCell[]
  modeByDay: ModeByDay[]
  modeByWeek: ModeByDay[]
  modeByWeekFlat: Array<Record<string, unknown>>
  stackModeKeys: string[]
  wpmDots: Array<{ period: string; value: number }>
}

/**
 * The hydrate / reindex payload shipped over IPC. `count` mirrors
 * `recordings.length` so Settings can show "X recordings" without
 * the renderer having to await the full payload before rendering the
 * status row.
 */
export interface HydratePayload {
  recordings: Recording[]
  aggregates: Aggregates
  indexedAt: string // ISO
  count: number
  /** Populated when scan failed (path missing/invalid). */
  error: string | null
}
