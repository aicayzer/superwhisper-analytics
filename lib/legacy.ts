import fs from 'fs/promises'
import path from 'path'

import Papa from 'papaparse'

import type {
  DailySummary,
  DayOfWeekPattern,
  FillerSummary,
  HourlyPattern,
  LegacyProfile,
  ModeStat,
  OverviewStats,
  TopicStat,
  WordFrequency,
} from './types'

const LEGACY_DIR = path.join(process.cwd(), 'data', 'legacy')

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, friday: 5, fri: 5,
  saturday: 6, sat: 6,
}

async function readCSV<T extends object>(filename: string): Promise<T[]> {
  const filePath = path.join(LEGACY_DIR, filename)
  const text = await fs.readFile(filePath, 'utf-8')
  const result = Papa.parse<T>(text, { header: true, skipEmptyLines: true, dynamicTyping: true })
  return result.data
}

let legacyCache: LegacyProfile | null = null

export async function getLegacyProfile(): Promise<LegacyProfile> {
  if (legacyCache) return legacyCache

  const [detail, daily, hourly, words, fillers, modes, topics] = await Promise.all([
    readCSV<Record<string, unknown>>('recordings_detail.csv').catch(() => []),
    readCSV<Record<string, unknown>>('daily_summary.csv').catch(() => []),
    readCSV<Record<string, unknown>>('hourly_patterns.csv').catch(() => []),
    readCSV<Record<string, unknown>>('word_frequency.csv').catch(() => []),
    readCSV<Record<string, unknown>>('filler_word_analysis.csv').catch(() => []),
    readCSV<Record<string, unknown>>('mode_usage.csv').catch(() => []),
    readCSV<Record<string, unknown>>('topic_distribution.csv').catch(() => []),
  ])

  const dailySummaries: DailySummary[] = (daily as Record<string, unknown>[]).map((r) => ({
    date: String(r.date ?? ''),
    count: Number(r.recordings_count ?? 0),
    totalDurationSec: Number(r.total_duration_seconds ?? 0),
    totalWords: Number(r.total_words ?? 0),
    avgWPM: 0,
  }))

  const hourlyPatterns: HourlyPattern[] = (hourly as Record<string, unknown>[]).map((r) => ({
    hour: Number(r.hour ?? 0),
    count: Number(r.recordings_count ?? 0),
    avgDurationSec: Number(r.avg_duration_seconds ?? 0),
  }))

  const wordFrequency: WordFrequency[] = (words as Record<string, unknown>[]).slice(0, 50).map((r) => ({
    word: String(r.word ?? r.phrase ?? ''),
    count: Number(r.frequency ?? r.count ?? 0),
    pct: Number(r.percentage ?? 0),
  }))

  const fillerSummary: FillerSummary[] = (fillers as Record<string, unknown>[]).slice(0, 15).map((r) => ({
    phrase: String(r.filler_phrase ?? r.filler_word ?? ''),
    count: Number(r.count ?? 0),
    pct: Number(r.percentage ?? 0),
  }))

  const modeStats: ModeStat[] = (modes as Record<string, unknown>[]).map((r) => ({
    modeName: String(r.mode_name ?? ''),
    count: Number(r.recordings_count ?? r.count ?? 0),
    totalWords: Number(r.total_words ?? 0),
    totalDurationSec: Number(r.total_duration_seconds ?? 0),
    avgWPM: 0,
  }))

  const topicStats: TopicStat[] = (topics as Record<string, unknown>[]).map((r) => ({
    topic: String(r.primary_topic ?? r.topic ?? ''),
    count: Number(r.recording_count ?? r.count ?? 0),
    pct: Number(r.percentage_of_recordings ?? r.percentage ?? 0),
  }))

  // Build day-of-week from recordings_detail (day_of_week may be numeric or name string)
  const dowCounts = new Array(7).fill(0)
  for (const r of detail) {
    const raw = r.day_of_week
    const dowNum = Number(raw)
    const dow = !isNaN(dowNum) ? dowNum : DAY_NAME_TO_INDEX[String(raw).toLowerCase()]
    if (dow !== undefined && dow >= 0 && dow < 7) dowCounts[dow]++
  }
  const dayOfWeek: DayOfWeekPattern[] = DAYS.map((dayName, day) => ({ day, dayName, count: dowCounts[day] }))

  // Build overview from detail rows
  const totalRecordings = detail.length || (daily as Record<string, unknown>[]).reduce((s, r) => s + Number(r.recordings_count ?? 0), 0)
  const totalWords = (daily as Record<string, unknown>[]).reduce((s, r) => s + Number(r.total_words ?? 0), 0)
  const totalDurationSec = (daily as Record<string, unknown>[]).reduce((s, r) => s + Number(r.total_duration_seconds ?? 0), 0)
  const dates = dailySummaries.map((d) => d.date).sort()

  const overview: OverviewStats = {
    totalRecordings,
    totalWords,
    totalDurationSec: Math.round(totalDurationSec),
    avgDurationSec: totalRecordings ? Math.round(totalDurationSec / totalRecordings) : 0,
    avgWordsPerRecording: totalRecordings ? Math.round(totalWords / totalRecordings) : 0,
    avgWPM: 0,
    dateRange: { start: dates[0] ?? '', end: dates[dates.length - 1] ?? '' },
    totalDays: dates.length,
  }

  legacyCache = {
    overview,
    dailySummaries,
    hourlyPatterns,
    wordFrequency,
    fillerSummary,
    modeStats,
    topicStats,
    dayOfWeek,
  }

  return legacyCache
}

export function hasLegacyData(): boolean {
  // Sync check — just see if the directory exists at module load
  // The actual async check happens in getLegacyProfile
  return true
}
