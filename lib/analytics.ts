import type {
  DailySummary,
  DayOfWeekPattern,
  FillerSummary,
  HourlyPattern,
  ModeStat,
  OverviewStats,
  Recording,
  TopicStat,
  WeeklyTrend,
  WordFrequency,
  WPMTrend,
} from './types'

// ── Filler words ─────────────────────────────────────────────────────────────

const FILLER_PHRASES: [string, RegExp][] = [
  ['you know', /\byou know\b/gi],
  ['i mean', /\bi mean\b/gi],
  ['sort of', /\bsort of\b/gi],
  ['kind of', /\bkind of\b/gi],
  ['i think', /\bi think\b/gi],
  ['i feel', /\bi feel\b/gi],
  ['i believe', /\bi believe\b/gi],
  ['you see', /\byou see\b/gi],
  ['as i said', /\bas i said\b/gi],
  ['in terms of', /\bin terms of\b/gi],
  ['at the end of the day', /\bat the end of the day\b/gi],
  ['to be honest', /\bto be honest\b/gi],
  ['to be fair', /\bto be fair\b/gi],
]

const FILLER_SINGLES: [string, RegExp][] = [
  ['um', /\bum\b/gi],
  ['uh', /\buh\b/gi],
  ['er', /\ber\b/gi],
  ['ah', /\bah\b/gi],
  ['hmm', /\bhmm\b/gi],
  ['like', /\blike\b/gi],
  ['basically', /\bbasically\b/gi],
  ['literally', /\bliterally\b/gi],
  ['actually', /\bactually\b/gi],
  ['right', /\bright(?!\s+(?:now|here|away|click|side))\b/gi],
  ['okay', /\bokay\b/gi],
  ['well', /\bwell\b/gi],
  ['yeah', /\byeah\b/gi],
  ['yep', /\byep\b/gi],
  ['honestly', /\bhonestly\b/gi],
  ['frankly', /\bfrankly\b/gi],
  ['clearly', /\bclearly\b/gi],
  ['obviously', /\bobviously\b/gi],
  ['simply', /\bsimply\b/gi],
  ['just', /\bjust\b/gi],
  ['really', /\breally\b/gi],
  ['quite', /\bquite\b/gi],
  ['rather', /\brather\b/gi],
]

// Check phrases first (longer matches win), then singles
const ALL_FILLERS: [string, RegExp][] = [...FILLER_PHRASES, ...FILLER_SINGLES]

export function computeFillerWords(text: string): {
  count: number
  pct: number
  breakdown: Record<string, number>
} {
  if (!text) return { count: 0, pct: 0, breakdown: {} }

  const wordCount = countWords(text)
  const breakdown: Record<string, number> = {}
  let total = 0

  for (const [label, re] of ALL_FILLERS) {
    const matches = text.match(re)
    if (matches && matches.length > 0) {
      breakdown[label] = matches.length
      total += matches.length
    }
  }

  return {
    count: total,
    pct: wordCount > 0 ? (total / wordCount) * 100 : 0,
    breakdown,
  }
}

// ── Word count + sentence count ───────────────────────────────────────────────

export function countWords(text: string): number {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

const ABBREV_RE = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|approx|e\.g|i\.e)\./gi

export function countSentences(text: string): number {
  if (!text.trim()) return 0
  const cleaned = text.replace(ABBREV_RE, (m) => m.replace('.', '@@'))
  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  return sentences.length
}

export function computeWPM(wordCount: number, durationMs: number): number {
  if (durationMs <= 0 || wordCount === 0) return 0
  return Math.round((wordCount / durationMs) * 60000)
}

// ── Topic classification ──────────────────────────────────────────────────────

const TOPICS: Record<string, string[]> = {
  'Code / Dev': [
    'function', 'code', 'variable', 'class', 'method', 'api', 'endpoint',
    'debug', 'error', 'bug', 'test', 'deploy', 'commit', 'branch',
    'pull request', 'component', 'typescript', 'javascript', 'python',
    'react', 'node', 'npm', 'package', 'import', 'export', 'async',
    'await', 'hook', 'state', 'prop', 'render', 'refactor',
  ],
  'Documentation': [
    'document', 'readme', 'docs', 'documentation', 'spec', 'specification',
    'write up', 'writeup', 'description', 'comment', 'annotation',
    'note down', 'jot', 'record', 'transcript',
  ],
  'Data': [
    'data', 'pipeline', 'database', 'query', 'sql', 'table', 'schema',
    'etl', 'transform', 'load', 'ingest', 'duckdb', 'csv', 'json',
    'parquet', 'warehouse', 'aggregate', 'filter', 'join', 'dataset',
  ],
  'Project Mgmt': [
    'project', 'sprint', 'milestone', 'ticket', 'backlog', 'priority',
    'deadline', 'timeline', 'planning', 'roadmap', 'meeting', 'standup',
    'retro', 'retrospective', 'estimate', 'epic', 'kanban', 'scrum',
  ],
  'Business': [
    'customer', 'client', 'business', 'revenue', 'product', 'user',
    'market', 'stakeholder', 'requirement', 'feature', 'growth',
    'strategy', 'objective', 'kpi', 'conversion', 'retention',
  ],
  'Feedback': [
    'feedback', 'review', 'change', 'update', 'fix', 'improve', 'suggest',
    'recommend', 'make sure', 'please', 'need to', 'should be', 'want to',
    'trying to', 'could you', 'would you',
  ],
  'Analysis': [
    'analyze', 'analysis', 'research', 'investigate', 'measure',
    'performance', 'benchmark', 'compare', 'evaluate', 'insight',
    'trend', 'pattern', 'understand', 'explore', 'hypothesis',
  ],
  'Architecture': [
    'architecture', 'system', 'infrastructure', 'service', 'microservice',
    'design', 'pattern', 'integration', 'scalability', 'cache', 'queue',
    'event', 'structure', 'abstraction', 'layer', 'module',
  ],
}

export function classifyTopics(text: string): {
  primary: string
  secondary: string[]
} {
  if (!text) return { primary: 'Unknown', secondary: [] }

  const lower = text.toLowerCase()
  const scores: Record<string, number> = {}

  for (const [topic, keywords] of Object.entries(TOPICS)) {
    scores[topic] = 0
    for (const kw of keywords) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      const matches = lower.match(re)
      if (matches) scores[topic] += matches.length
    }
  }

  const sorted = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)

  if (sorted.length === 0) return { primary: 'Unknown', secondary: [] }

  const [primary] = sorted[0]
  const secondary = sorted
    .slice(1, 4)
    .filter(([, score]) => score > 0)
    .map(([topic]) => topic)

  return { primary, secondary }
}

// ── Aggregate builders (called once during cache build) ───────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'of', 'to', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'about', 'into', 'through',
  'before', 'after', 'out', 'over', 'then', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'each', 'more', 'most', 'other',
  'some', 'such', 'no', 'not', 'only', 'same', 'than', 'too', 'very',
  'just', 'or', 'but', 'and', 'that', 'this', 'these', 'those',
  'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what',
  'which', 'who', 'so', 'if', 'also', 'like', 'up', 'we', 'one',
  'two', 'go', 'get', 'got', 'use', 'used', 'using', 'think', 'know',
  'want', 'need', 'make', 'made', 'see', 'look', 'come', 'going',
  'yeah', 'okay', 'um', 'uh', 'well', 'right', 'now', 'really',
])

export function buildWordFrequency(recordings: Recording[]): WordFrequency[] {
  const freq = new Map<string, number>()
  let total = 0

  for (const r of recordings) {
    if (!r.result) continue
    const words = r.result.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? []
    for (const w of words) {
      if (!STOP_WORDS.has(w)) {
        freq.set(w, (freq.get(w) ?? 0) + 1)
        total++
      }
    }
  }

  return Array.from(freq.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([word, count]) => ({ word, count, pct: (count / total) * 100 }))
}

export function buildFillerSummary(recordings: Recording[]): FillerSummary[] {
  const totals = new Map<string, number>()
  let grand = 0

  for (const r of recordings) {
    for (const [phrase, count] of Object.entries(r.fillerBreakdown)) {
      totals.set(phrase, (totals.get(phrase) ?? 0) + count)
      grand += count
    }
  }

  return Array.from(totals.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([phrase, count]) => ({
      phrase,
      count,
      pct: grand > 0 ? (count / grand) * 100 : 0,
    }))
}

export function buildDailySummaries(recordings: Recording[]): DailySummary[] {
  const byDate = new Map<string, { count: number; words: number; durationSec: number; wpms: number[] }>()

  for (const r of recordings) {
    const date = r.datetime.slice(0, 10)
    const entry = byDate.get(date) ?? { count: 0, words: 0, durationSec: 0, wpms: [] }
    entry.count++
    entry.words += r.wordCount
    entry.durationSec += r.duration / 1000
    if (r.wordsPerMinute > 0) entry.wpms.push(r.wordsPerMinute)
    byDate.set(date, entry)
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, e]) => ({
      date,
      count: e.count,
      totalDurationSec: Math.round(e.durationSec),
      totalWords: e.words,
      avgWPM: e.wpms.length ? Math.round(e.wpms.reduce((a, b) => a + b) / e.wpms.length) : 0,
    }))
}

export function buildHourlyPatterns(recordings: Recording[]): HourlyPattern[] {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i, count: 0, totalDurationSec: 0,
  }))

  for (const r of recordings) {
    const h = new Date(r.datetime).getHours()
    hours[h].count++
    hours[h].totalDurationSec += r.duration / 1000
  }

  return hours.map((h) => ({
    hour: h.hour,
    count: h.count,
    avgDurationSec: h.count > 0 ? Math.round(h.totalDurationSec / h.count) : 0,
  }))
}

export function buildDayOfWeek(recordings: Recording[]): DayOfWeekPattern[] {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const counts = new Array(7).fill(0)

  for (const r of recordings) {
    counts[new Date(r.datetime).getDay()]++
  }

  return DAYS.map((dayName, day) => ({ day, dayName, count: counts[day] }))
}

export function buildWeeklyTrends(dailySummaries: DailySummary[]): WeeklyTrend[] {
  const byWeek = new Map<string, { count: number; words: number }>()

  for (const d of dailySummaries) {
    const date = new Date(d.date)
    const dow = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((dow + 6) % 7))
    const week = monday.toISOString().slice(0, 10)
    const entry = byWeek.get(week) ?? { count: 0, words: 0 }
    entry.count += d.count
    entry.words += d.totalWords
    byWeek.set(week, entry)
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, e]) => ({ week, count: e.count, totalWords: e.words }))
}

export function buildWPMTrend(dailySummaries: DailySummary[]): WPMTrend[] {
  return dailySummaries
    .filter((d) => d.avgWPM > 0)
    .map((d) => ({ date: d.date, avgWPM: d.avgWPM }))
}

export function buildModeStats(recordings: Recording[]): ModeStat[] {
  const byMode = new Map<string, { count: number; words: number; durationSec: number; wpms: number[] }>()

  for (const r of recordings) {
    const mode = r.modeName || 'Default'
    const entry = byMode.get(mode) ?? { count: 0, words: 0, durationSec: 0, wpms: [] }
    entry.count++
    entry.words += r.wordCount
    entry.durationSec += r.duration / 1000
    if (r.wordsPerMinute > 0) entry.wpms.push(r.wordsPerMinute)
    byMode.set(mode, entry)
  }

  return Array.from(byMode.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([modeName, e]) => ({
      modeName,
      count: e.count,
      totalWords: e.words,
      totalDurationSec: Math.round(e.durationSec),
      avgWPM: e.wpms.length ? Math.round(e.wpms.reduce((a, b) => a + b) / e.wpms.length) : 0,
    }))
}

export function buildTopicStats(recordings: Recording[]): TopicStat[] {
  const totals = new Map<string, number>()
  for (const r of recordings) {
    totals.set(r.primaryTopic, (totals.get(r.primaryTopic) ?? 0) + 1)
  }
  const grand = recordings.length
  return Array.from(totals.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([topic, count]) => ({ topic, count, pct: (count / grand) * 100 }))
}

export function buildOverview(recordings: Recording[], dateRange: { start: string; end: string }): OverviewStats {
  const withWords = recordings.filter((r) => r.wordsPerMinute > 0)
  const totalWords = recordings.reduce((s, r) => s + r.wordCount, 0)
  const totalDurationSec = recordings.reduce((s, r) => s + r.duration / 1000, 0)
  const avgWPM = withWords.length
    ? Math.round(withWords.reduce((s, r) => s + r.wordsPerMinute, 0) / withWords.length)
    : 0

  const days = dateRange.start && dateRange.end
    ? Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / 86400000) + 1
    : 0

  return {
    totalRecordings: recordings.length,
    totalWords,
    totalDurationSec: Math.round(totalDurationSec),
    avgDurationSec: recordings.length ? Math.round(totalDurationSec / recordings.length) : 0,
    avgWordsPerRecording: recordings.length ? Math.round(totalWords / recordings.length) : 0,
    avgWPM,
    dateRange,
    totalDays: days,
  }
}
