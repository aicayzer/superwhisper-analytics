/**
 * Canonical shapes used across the renderer.
 *
 * Wave 1 these are produced by `lib/mock.ts`. Wave 2 the same shapes will
 * come from a main-process scanner over the SuperWhisper folder, fed via
 * IPC. Screens consume the shapes only — never the source.
 */

export interface Segment {
  start: number // seconds
  end: number // seconds
  text: string
}

export interface Recording {
  id: string // unix timestamp string ("1755164573")
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
  waveform: number[] // mock peaks, normalised 0..1
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
  day: number // 0 = Sun
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

// ---- New for wave 1.5: Usage + Language aggregates ----------------------

export interface HourlyPattern {
  hour: number // 0-23
  count: number
  totalDurationSec: number
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

/** 7×24 number matrix — rows are days (0=Sun), cols are hours. */
export type Heatmap = number[][]
