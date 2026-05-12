import { emptyAggregates } from '@shared/empty-aggregates'
import { tokenise } from '@shared/text-metrics'
import type {
  Aggregates,
  DailySummary,
  DayOfWeekPattern,
  DurationBucket,
  Heatmap,
  LanguageStats,
  ModeByDay,
  ModeStat,
  OverviewStats,
  Recording,
  SentenceBucket,
  SparkSeries,
  StreakCell,
  TrendPoint,
  UsageStats,
  WordFrequency
} from '@shared/types'

/**
 * Pure functions that turn a `Recording[]` into the bundle of aggregate
 * shapes the renderer's data store exposes.
 *
 * Anchored to a `now` parameter (defaulting to `new Date()`) so
 * trailing-window aggregates (streakCells, sparklines) behave the same
 * way every launch — and so unit tests can hold time still if we ever
 * write any.
 */

// ---------- Helpers ------------------------------------------------------

const DAY_NAMES_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** JS Date.getDay() is Sun-first (0..6 = Sun..Sat); remap to Mon-first. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function isoWeek(dt: Date): string {
  const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${pad2(weekNum)}`
}

/** YYYY-MM-DD (calendar day in local time). */
function dayKey(dt: Date): string {
  return dateKey(dt)
}

/** YYYY-MM (calendar month). */
function monthKey(dt: Date): string {
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`
}

export type BucketBy = 'day' | 'week' | 'month'

/** Map a date into a period key based on the chosen granularity. */
function bucketKey(dt: Date, bucketBy: BucketBy): string {
  switch (bucketBy) {
    case 'day':
      return dayKey(dt)
    case 'week':
      return isoWeek(dt)
    case 'month':
      return monthKey(dt)
  }
}

/** Walk every day in [start, end] inclusive, calling fn(date) for each. */
function eachDay(start: Date, end: Date, fn: (d: Date) => void): void {
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (cur.getTime() <= last.getTime()) {
    fn(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
}

const EMPTY_OVERVIEW: OverviewStats = {
  totalRecordings: 0,
  totalWords: 0,
  totalDurationSec: 0,
  avgWPM: 0,
  avgDurationSec: 0,
  dateRange: { start: '', end: '' },
  activeDays: 0
}

const EMPTY_LANGUAGE: LanguageStats = {
  avgWPM: 0,
  fillerRatePct: 0,
  vocabularyCount: 0,
  avgSentenceLength: 0
}

const EMPTY_USAGE: UsageStats = {
  currentStreak: 0,
  longestStreak: 0,
  avgPerActiveDay: 0,
  timePerActiveDaySec: 0
}

// ---------- Per-shape computation ---------------------------------------

function computeOverview(
  recordings: Recording[],
  totalWords: number,
  totalDurationSec: number
): OverviewStats {
  if (recordings.length === 0) return EMPTY_OVERVIEW
  const avgWPM = totalDurationSec > 0 ? Math.round((totalWords / totalDurationSec) * 60) : 0
  const datetimes = recordings.map((r) => r.datetime)
  const start = datetimes.reduce((a, b) => (a < b ? a : b))
  const end = datetimes.reduce((a, b) => (a > b ? a : b))
  return {
    totalRecordings: recordings.length,
    totalWords,
    totalDurationSec,
    avgWPM,
    avgDurationSec: totalDurationSec / recordings.length,
    dateRange: { start, end },
    activeDays: new Set(recordings.map((r) => r.datetime.slice(0, 10))).size
  }
}

function computeDaily(recordings: Recording[]): DailySummary[] {
  if (recordings.length === 0) return []
  const map = new Map<string, DailySummary>()
  // Seed every day in the recording range so charts have a continuous X.
  const dates = recordings.map((r) => new Date(r.datetime)).filter((d) => !isNaN(d.getTime()))
  if (dates.length === 0) return []
  const start = new Date(Math.min(...dates.map((d) => d.getTime())))
  const end = new Date(Math.max(...dates.map((d) => d.getTime())))
  eachDay(start, end, (d) => {
    const key = dateKey(d)
    map.set(key, { date: key, count: 0, totalWords: 0, totalDurationSec: 0 })
  })
  for (const r of recordings) {
    const key = r.datetime.slice(0, 10)
    const cur = map.get(key)
    if (!cur) continue
    cur.count++
    cur.totalWords += r.wordCount
    cur.totalDurationSec += r.duration / 1000
  }
  return Array.from(map.values())
}

function computeDayOfWeek(recordings: Recording[]): DayOfWeekPattern[] {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const r of recordings) {
    const d = new Date(r.datetime)
    if (isNaN(d.getTime())) continue
    const idx = mondayIndex(d)
    counts[idx] = (counts[idx] ?? 0) + 1
  }
  return DAY_NAMES_MON_FIRST.map((name, day) => ({
    day,
    dayName: name,
    count: counts[day] ?? 0
  }))
}

function computeHeatmap(recordings: Recording[]): Heatmap {
  const matrix: Heatmap = Array.from({ length: 7 }, () => Array(24).fill(0) as number[])
  for (const r of recordings) {
    const d = new Date(r.datetime)
    if (isNaN(d.getTime())) continue
    const row = matrix[mondayIndex(d)]
    if (!row) continue
    row[d.getHours()] = (row[d.getHours()] ?? 0) + 1
  }
  return matrix
}

function computeModeStats(recordings: Recording[]): ModeStat[] {
  const buckets = new Map<string, ModeStat>()
  for (const r of recordings) {
    const cur = buckets.get(r.modeName) ?? {
      modeName: r.modeName,
      count: 0,
      totalWords: 0,
      totalDurationSec: 0,
      pct: 0
    }
    cur.count++
    cur.totalWords += r.wordCount
    cur.totalDurationSec += r.duration / 1000
    buckets.set(r.modeName, cur)
  }
  const total = recordings.length || 1
  return Array.from(buckets.values())
    .map((m) => ({ ...m, pct: m.count / total }))
    .sort((a, b) => b.count - a.count)
}

function computeWordFrequency(recordings: Recording[]): {
  list: WordFrequency[]
  uniqueCount: number
} {
  const counts = new Map<string, number>()
  for (const r of recordings) {
    if (!r.result) continue
    for (const w of tokenise(r.result)) {
      counts.set(w, (counts.get(w) ?? 0) + 1)
    }
  }
  const list = Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 200) // cap so the IPC payload doesn't carry tail noise
  return { list, uniqueCount: counts.size }
}

function computeFillerSummary(recordings: Recording[]): Array<{ phrase: string; count: number }> {
  const totals = new Map<string, number>()
  for (const r of recordings) {
    for (const f of r.fillerBreakdown) {
      totals.set(f.phrase, (totals.get(f.phrase) ?? 0) + f.count)
    }
  }
  return Array.from(totals.entries())
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count)
}

const DURATION_BUCKETS = [
  { label: '<10s', min: 0, max: 10 },
  { label: '10–30s', min: 10, max: 30 },
  { label: '30–60s', min: 30, max: 60 },
  { label: '1–2m', min: 60, max: 120 },
  { label: '2–5m', min: 120, max: 300 },
  { label: '5m+', min: 300, max: Infinity }
] as const

function computeDurationDist(recordings: Recording[]): DurationBucket[] {
  const out: DurationBucket[] = DURATION_BUCKETS.map((b) => ({ ...b, count: 0 }))
  for (const r of recordings) {
    const sec = r.duration / 1000
    const b = out.find((b) => sec >= b.min && sec < b.max)
    if (b) b.count++
  }
  return out
}

const SENTENCE_BUCKETS = [
  { label: '≤5', min: 0, max: 6 },
  { label: '6–10', min: 6, max: 11 },
  { label: '11–15', min: 11, max: 16 },
  { label: '16–20', min: 16, max: 21 },
  { label: '21–25', min: 21, max: 26 },
  { label: '25+', min: 26, max: Infinity }
] as const

function computeSentenceDist(recordings: Recording[]): SentenceBucket[] {
  const out: SentenceBucket[] = SENTENCE_BUCKETS.map((b) => ({ ...b, count: 0 }))
  for (const r of recordings) {
    if (r.sentenceCount <= 0 || r.wordCount <= 0) continue
    const avg = r.wordCount / r.sentenceCount
    const b = out.find((b) => avg >= b.min && avg < b.max)
    if (b) b.count++
  }
  return out
}

function computeStreaks(daily: DailySummary[]): { current: number; longest: number } {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
  let longest = 0
  let run = 0
  for (const d of sorted) {
    if (d.count > 0) {
      run++
      if (run > longest) longest = run
    } else {
      run = 0
    }
  }
  let current = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if ((sorted[i]?.count ?? 0) > 0) current++
    else break
  }
  return { current, longest }
}

function computeUsage(
  recordings: Recording[],
  totalDurationSec: number,
  daily: DailySummary[],
  activeDays: number
): UsageStats {
  if (recordings.length === 0) return EMPTY_USAGE
  const { current, longest } = computeStreaks(daily)
  const safeActive = Math.max(1, activeDays)
  return {
    currentStreak: current,
    longestStreak: longest,
    avgPerActiveDay: recordings.length / safeActive,
    timePerActiveDaySec: totalDurationSec / safeActive
  }
}

function computeWpmTrend(recordings: Recording[], bucketBy: BucketBy): TrendPoint[] {
  const buckets = new Map<string, { sumWords: number; sumSec: number }>()
  for (const r of recordings) {
    const d = new Date(r.datetime)
    if (isNaN(d.getTime())) continue
    const period = bucketKey(d, bucketBy)
    const cur = buckets.get(period) ?? { sumWords: 0, sumSec: 0 }
    cur.sumWords += r.wordCount
    cur.sumSec += r.duration / 1000
    buckets.set(period, cur)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      value: v.sumSec > 0 ? Math.round((v.sumWords / v.sumSec) * 60) : 0
    }))
}

function computeFillerTrend(recordings: Recording[], bucketBy: BucketBy): TrendPoint[] {
  const buckets = new Map<string, { fillers: number; words: number }>()
  for (const r of recordings) {
    const d = new Date(r.datetime)
    if (isNaN(d.getTime())) continue
    const period = bucketKey(d, bucketBy)
    const cur = buckets.get(period) ?? { fillers: 0, words: 0 }
    cur.fillers += r.fillerCount
    cur.words += r.wordCount
    buckets.set(period, cur)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      value: v.words > 0 ? +((v.fillers / v.words) * 100).toFixed(2) : 0
    }))
}

function computeVocabGrowth(recordings: Recording[], bucketBy: BucketBy): TrendPoint[] {
  const sorted = [...recordings].sort((a, b) => a.datetime.localeCompare(b.datetime))
  const seen = new Set<string>()
  const buckets = new Map<string, number>()
  for (const r of sorted) {
    const d = new Date(r.datetime)
    if (isNaN(d.getTime())) continue
    const period = bucketKey(d, bucketBy)
    if (r.result) for (const w of tokenise(r.result)) seen.add(w)
    buckets.set(period, seen.size)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({ period, value }))
}

function computeLanguage(
  recordings: Recording[],
  totalWords: number,
  vocabularyCount: number,
  totalDurationSec: number
): LanguageStats {
  if (recordings.length === 0) return EMPTY_LANGUAGE
  const totalSentences = recordings.reduce((s, r) => s + r.sentenceCount, 0)
  const totalFiller = recordings.reduce((s, r) => s + r.fillerCount, 0)
  return {
    avgWPM: totalDurationSec > 0 ? Math.round((totalWords / totalDurationSec) * 60) : 0,
    fillerRatePct: totalWords > 0 ? +((totalFiller / totalWords) * 100).toFixed(2) : 0,
    vocabularyCount,
    avgSentenceLength: totalSentences > 0 ? +(totalWords / totalSentences).toFixed(1) : 0
  }
}

function computeSparklines(
  daily: DailySummary[],
  avgWPMFallback: number,
  now: Date
): Aggregates['sparklines'] {
  const SPARK_DAYS = 30
  const startMs = now.getTime() - (SPARK_DAYS - 1) * 24 * 3600 * 1000
  const start = new Date(startMs)
  const dayMap = new Map(daily.map((d) => [d.date, d]))
  const recent: DailySummary[] = []
  eachDay(start, now, (d) => {
    const key = dateKey(d)
    recent.push(dayMap.get(key) ?? { date: key, count: 0, totalWords: 0, totalDurationSec: 0 })
  })
  const labels = recent.map((d) => d.date)
  const wpmValues = recent.map((d) =>
    d.totalDurationSec > 0 ? Math.round((d.totalWords / d.totalDurationSec) * 60) : avgWPMFallback
  )
  const make = (values: number[]): SparkSeries => ({ values, labels })
  return {
    recordings: make(recent.map((d) => d.count)),
    words: make(recent.map((d) => d.totalWords)),
    duration: make(recent.map((d) => Math.round(d.totalDurationSec))),
    wpm: make(wpmValues)
  }
}

function computeStreakCells(daily: DailySummary[], now: Date, windowDays = 365): StreakCell[] {
  const days = Math.max(1, Math.min(365, Math.floor(windowDays)))
  const start = new Date(now.getTime() - (days - 1) * 24 * 3600 * 1000)
  const dayMap = new Map(daily.map((d) => [d.date, d]))
  const cells: StreakCell[] = []
  eachDay(start, now, (d) => {
    const key = dateKey(d)
    cells.push({ date: key, count: dayMap.get(key)?.count ?? 0 })
  })
  return cells
}

function computeModeByDay(
  recordings: Recording[],
  daily: DailySummary[],
  topModes: string[]
): {
  byDay: ModeByDay[]
  byWeek: ModeByDay[]
  weekFlat: Array<Record<string, unknown>>
  keys: string[]
} {
  const byDayMap = new Map<string, ModeByDay>()
  const ensureDay = (key: string): ModeByDay => {
    let cur = byDayMap.get(key)
    if (!cur) {
      cur = { date: key, modes: {} }
      byDayMap.set(key, cur)
    }
    return cur
  }
  for (const d of daily) ensureDay(d.date)
  for (const r of recordings) {
    const key = r.datetime.slice(0, 10)
    if (!key) continue
    const slot = ensureDay(key)
    const bucket = topModes.includes(r.modeName) ? r.modeName : 'Other'
    slot.modes[bucket] = (slot.modes[bucket] ?? 0) + 1
  }
  const byDay = Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // By-week aggregation, keyed off ISO week of each day's date.
  const byWeekMap = new Map<string, ModeByDay>()
  for (const day of byDay) {
    const d = new Date(day.date)
    if (isNaN(d.getTime())) continue
    const period = isoWeek(d)
    let cur = byWeekMap.get(period)
    if (!cur) {
      cur = { date: period, modes: {} }
      byWeekMap.set(period, cur)
    }
    for (const [k, v] of Object.entries(day.modes)) {
      cur.modes[k] = (cur.modes[k] ?? 0) + v
    }
  }
  const byWeek = Array.from(byWeekMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  const keys = [...topModes, 'Other']
  const weekFlat: Array<Record<string, unknown>> = byWeek.map((w) => {
    const row: Record<string, unknown> = { date: w.date }
    for (const k of keys) row[k] = w.modes[k] ?? 0
    return row
  })
  return { byDay, byWeek, weekFlat, keys }
}

function computeWpmDots(
  recordings: Recording[],
  bucketBy: BucketBy
): Array<{ period: string; value: number }> {
  // Each dot is one recording placed on the trend's X axis. The bucket
  // key has to match the trend's bucketing — otherwise the dots stack
  // monthly even when the trend is daily/weekly, which used to render
  // as a vertical "histogram bar" at the start of every calendar month.
  return [...recordings]
    .map((r) => {
      const d = new Date(r.datetime)
      const period = isNaN(d.getTime()) ? r.datetime.slice(0, 7) : bucketKey(d, bucketBy)
      return { period, value: r.wordsPerMinute }
    })
    .sort((a, b) => a.period.localeCompare(b.period))
}

// ---------- Top-level entry point ---------------------------------------

export interface ComputeAllOptions {
  /** Trend bucketing for wpm/filler/vocab — caller chooses based on the
   *  active range window. Defaults to 'week' which matches the legacy
   *  behaviour for filler / vocab. */
  bucketBy?: BucketBy
  /** Days of streak-calendar history to emit. Defaults to 365 to match
   *  the legacy "full year" cell grid. */
  streakWindowDays?: number
}

export function computeAll(
  recordings: Recording[],
  now: Date = new Date(),
  opts: ComputeAllOptions = {}
): Aggregates {
  const bucketBy: BucketBy = opts.bucketBy ?? 'week'
  const streakWindowDays = opts.streakWindowDays ?? 365
  const totalDurationSec = recordings.reduce((s, r) => s + r.duration, 0) / 1000
  const totalWords = recordings.reduce((s, r) => s + r.wordCount, 0)

  const overview = computeOverview(recordings, totalWords, totalDurationSec)
  const daily = computeDaily(recordings)
  const dayOfWeek = computeDayOfWeek(recordings)
  const heatmap = computeHeatmap(recordings)
  const modeStats = computeModeStats(recordings)
  const { list: wordFrequency, uniqueCount } = computeWordFrequency(recordings)
  const fillerSummary = computeFillerSummary(recordings)
  const durationDist = computeDurationDist(recordings)
  const sentenceDist = computeSentenceDist(recordings)
  const usage = computeUsage(recordings, totalDurationSec, daily, overview.activeDays)
  const wpmTrend = computeWpmTrend(recordings, bucketBy)
  const fillerTrend = computeFillerTrend(recordings, bucketBy)
  const vocabGrowth = computeVocabGrowth(recordings, bucketBy)
  const language = computeLanguage(recordings, totalWords, uniqueCount, totalDurationSec)
  const sparklines = computeSparklines(daily, overview.avgWPM, now)
  const streakCells = computeStreakCells(daily, now, streakWindowDays)
  const topModes = modeStats.slice(0, 5).map((m) => m.modeName)
  const { byDay, byWeek, weekFlat, keys } = computeModeByDay(recordings, daily, topModes)
  const wpmDots = computeWpmDots(recordings, bucketBy)

  return {
    overview,
    daily,
    dayOfWeek,
    modeStats,
    wordFrequency,
    fillerSummary,
    heatmap,
    durationDist,
    usage,
    wpmTrend,
    fillerTrend,
    sentenceDist,
    vocabGrowth,
    language,
    sparklines,
    streakCells,
    modeByDay: byDay,
    modeByWeek: byWeek,
    modeByWeekFlat: weekFlat,
    stackModeKeys: keys,
    wpmDots
  }
}

// emptyAggregates() is now in @shared/empty-aggregates so the renderer
// can reuse the same factory for its dataStore initial state. Re-export
// here for consumers that previously imported it from `./aggregates`.
export { emptyAggregates }
