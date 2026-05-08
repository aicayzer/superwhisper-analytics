export interface Segment {
  start: number
  end: number
  text: string
}

export interface Recording {
  id: string
  result: string
  duration: number // ms
  datetime: string // ISO 8601
  modeName: string
  modelKey: string
  modelName: string
  appVersion: string
  recordingDevice: string
  languageSelected: string
  segments: Segment[]
  systemAudioEnabled: boolean
  realtimeEnabled: boolean
  translationEnabled: boolean
  // derived
  wordCount: number
  wordsPerMinute: number
  sentenceCount: number
  fillerWordCount: number
  fillerWordPct: number
  fillerBreakdown: Record<string, number>
  primaryTopic: string
  secondaryTopics: string[]
  hasAudio: boolean
}

export interface RecordingListItem {
  id: string
  datetime: string
  modeName: string
  wordCount: number
  duration: number
  wordsPerMinute: number
  primaryTopic: string
  excerpt: string
}

export interface OverviewStats {
  totalRecordings: number
  totalWords: number
  totalDurationSec: number
  avgDurationSec: number
  avgWordsPerRecording: number
  avgWPM: number
  dateRange: { start: string; end: string }
  totalDays: number
}

export interface DailySummary {
  date: string
  count: number
  totalDurationSec: number
  totalWords: number
  avgWPM: number
}

export interface HourlyPattern {
  hour: number
  count: number
  avgDurationSec: number
}

export interface DayOfWeekPattern {
  day: number
  dayName: string
  count: number
}

export interface WeeklyTrend {
  week: string // ISO week start date YYYY-MM-DD
  count: number
  totalWords: number
}

export interface WordFrequency {
  word: string
  count: number
  pct: number
}

export interface FillerSummary {
  phrase: string
  count: number
  pct: number
}

export interface WPMTrend {
  date: string
  avgWPM: number
}

export interface ModeStat {
  modeName: string
  count: number
  totalWords: number
  totalDurationSec: number
  avgWPM: number
}

export interface TopicStat {
  topic: string
  count: number
  pct: number
}

export interface CacheState {
  recordings: Recording[]
  builtAt: number
  path: string
  // pre-aggregated
  overview: OverviewStats
  dailySummaries: DailySummary[]
  hourlyPatterns: HourlyPattern[]
  dayOfWeek: DayOfWeekPattern[]
  weeklyTrends: WeeklyTrend[]
  wordFrequency: WordFrequency[]
  fillerSummary: FillerSummary[]
  wpmTrend: WPMTrend[]
  modeStats: ModeStat[]
  topicStats: TopicStat[]
}

// Legacy (ON) profile loaded from CSVs
export interface LegacyProfile {
  overview: OverviewStats
  dailySummaries: DailySummary[]
  hourlyPatterns: HourlyPattern[]
  wordFrequency: WordFrequency[]
  fillerSummary: FillerSummary[]
  modeStats: ModeStat[]
  topicStats: TopicStat[]
  dayOfWeek: DayOfWeekPattern[]
}

export interface RecordingsResponse {
  items: RecordingListItem[]
  total: number
  page: number
  pageSize: number
}
