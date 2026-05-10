/**
 * Wave-1 mock data. Deterministic — uses a fixed seed so screens render the
 * same way every reload. Shape mirrors the real `meta.json` SuperWhisper
 * stores, plus a few derived metrics we'd compute on the fly.
 *
 * Replace by swapping the import once the IPC scanner lands in wave 2 — no
 * screen should ever import from this file once real data flows.
 */

import { tokenise } from './text'
import type {
  DailySummary,
  DayOfWeekPattern,
  DurationBucket,
  Heatmap,
  HourlyPattern,
  LanguageStats,
  ModeByDay,
  ModeStat,
  OverviewStats,
  Recording,
  Segment,
  SentenceBucket,
  SparkSeries,
  StreakCell,
  TrendPoint,
  UsageStats,
  WordFrequency
} from './types'

const SEED = 424242
const NUM_RECORDINGS = 280
const DAYS_SPAN = 270

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(SEED)
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!
const between = (a: number, b: number): number => a + rand() * (b - a)
const intBetween = (a: number, b: number): number => Math.floor(between(a, b + 1))

const MODES: ReadonlyArray<{ name: string; weight: number }> = [
  { name: 'Default', weight: 60 },
  { name: 'Email', weight: 14 },
  { name: 'Notes', weight: 9 },
  { name: 'Slack', weight: 6 },
  { name: 'Code', weight: 5 },
  { name: 'Docs', weight: 3 },
  { name: 'Brainstorm', weight: 2 },
  { name: 'Voicemail', weight: 1 }
]

const MODELS = ['sw-ultra-cloud-v1-east', 'sw-ultra-cloud-v1-west', 'sw-pro-local-v3', 'sw-fast-v2']
const DEVICES = ['', '', '', 'ExternalUSB', 'AirPods Pro', 'MacBook Pro Microphone']
const LANGUAGES = ['en']

const SAMPLE_TEMPLATES: ReadonlyArray<string[]> = [
  [
    'Just a quick thought before this drops out of my head.',
    'I think the way to frame this is around what we already know works.',
    'Specifically the bit about the integration layer needing to be more declarative.',
    'I want to come back to this tomorrow with a clearer head.'
  ],
  [
    'Hey, just calling about the meeting we had earlier this week.',
    'I wanted to follow up on a couple of the points around the schedule.',
    'Give me a call back when you get a chance.'
  ],
  [
    'Right, so the issue I was running into with the build pipeline.',
    'It looks like the cache key is not being invalidated properly when the lockfile changes.',
    'Going to write up a fix for that and see if it lands cleanly on the dev branch.'
  ],
  [
    'Quick note on the design review.',
    'The transcript view is much closer to what I had in mind, but the spacing on the side panel is still a touch tight.',
    'Worth revisiting the gutter sizing once we have the real data flowing.'
  ],
  [
    'Reminder to myself, I mean, I really need to finish the readme for that project.',
    'It has been sitting on my todo list for two weeks now.',
    'Maybe today is the day.'
  ],
  [
    'So the way I am thinking about this is more like a state machine than a linear flow.',
    'You start in unconfigured, you transition into configured once the path is set, and only then you can run.',
    'The error states are off to the side rather than in the main path.'
  ],
  [
    'Email follow up. Hi Michael, thanks for the call earlier today.',
    'As discussed, I will send over the brief by end of week and we can pick a time next Tuesday.',
    'Best regards, August.'
  ],
  [
    'Just thinking out loud about the audio playback bit.',
    'Would be nice if clicking on a segment made the cursor jump and the waveform highlighted that segment, but it does not need to be fancy in v1.',
    'Honestly even space to play and pause would be a big improvement.'
  ],
  [
    'OK so the question, uh, the question is whether we ship this with signing or without.',
    'I think without is fine for the first cut. We can add it later.',
    'The README can carry the right click open caveat for now.'
  ],
  [
    'Right, captured a bunch of feedback from the demo session yesterday.',
    'The big one is that the keyboard shortcuts are not discoverable at all.',
    'I think the command palette can probably surface them, you know, with a section called shortcuts or something like that.'
  ],
  [
    'Quick brainstorm on what would actually be the killer feature here.',
    'I think it is the timeline navigation. Being able to scrub through nine months of dictation and watch your speaking patterns shift would be genuinely interesting.',
    'I do not know how to ship that in v1 but it is worth keeping in mind.'
  ],
  [
    'Thinking about the structure of the settings page.',
    'I really do not want it to look heavy. Just a column of grouped controls, no boxes around boxes.',
    'You know, the way Things does it. Just clean rows.'
  ]
]

const FILLER_PHRASES = [
  'um',
  'uh',
  'like',
  'you know',
  'I mean',
  'so',
  'right',
  'kind of',
  'sort of',
  'basically',
  'actually'
] as const

function pickWeightedMode(): string {
  const total = MODES.reduce((s, m) => s + m.weight, 0)
  let r = rand() * total
  for (const m of MODES) {
    r -= m.weight
    if (r <= 0) return m.name
  }
  return MODES[0]!.name
}

function buildTranscript(): string {
  const template = pick(SAMPLE_TEMPLATES)
  const sentences = template.slice(0, intBetween(2, template.length))
  return sentences.join(' ')
}

function buildSegments(transcript: string, durationMs: number): Segment[] {
  const sentences = transcript.split(/(?<=[.?!])\s+/).filter(Boolean)
  if (sentences.length === 0) return []
  const totalSec = durationMs / 1000
  const totalChars = sentences.reduce((s, x) => s + x.length, 0)
  let cursor = 0
  return sentences.map((text) => {
    const span = (text.length / totalChars) * totalSec
    const start = cursor
    const end = Math.min(totalSec, cursor + span)
    cursor = end
    return { start, end, text }
  })
}

function buildWaveform(durationMs: number): number[] {
  const seconds = Math.max(2, Math.round(durationMs / 1000))
  const peaks: number[] = []
  let phase = 0
  for (let i = 0; i < seconds * 4; i++) {
    phase += between(0.05, 0.5)
    const base = 0.35 + 0.55 * Math.abs(Math.sin(phase))
    const jitter = between(-0.15, 0.15)
    peaks.push(Math.max(0.05, Math.min(1, base + jitter)))
  }
  return peaks
}

function buildFillers(transcript: string): {
  count: number
  breakdown: Array<{ phrase: string; count: number }>
} {
  const lower = ` ${transcript.toLowerCase()} `
  const counts = new Map<string, number>()
  let total = 0
  for (const phrase of FILLER_PHRASES) {
    const matches = lower.match(new RegExp(`(?<=\\W)${phrase.replace(/ /g, '\\s+')}(?=\\W)`, 'g'))
    if (matches && matches.length > 0) {
      counts.set(phrase, matches.length)
      total += matches.length
    }
  }
  return {
    count: total,
    breakdown: Array.from(counts.entries())
      .map(([phrase, count]) => ({ phrase, count }))
      .sort((a, b) => b.count - a.count)
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const NOW = new Date('2026-05-08T17:00:00')
const recordings: Recording[] = []
const startMs = NOW.getTime() - DAYS_SPAN * 24 * 3600 * 1000

for (let i = 0; i < NUM_RECORDINGS; i++) {
  const dayOffset = Math.floor(rand() ** 0.85 * DAYS_SPAN) // bias toward recent days
  const ts = startMs + (DAYS_SPAN - dayOffset) * 24 * 3600 * 1000 + rand() * 24 * 3600 * 1000
  const d = new Date(ts)

  const mode = pickWeightedMode()
  const baseSeconds = mode === 'Voicemail' ? between(15, 80) : between(8, 220)
  const wpmTarget = between(110, 165)
  const wordCount = Math.max(5, Math.round((baseSeconds / 60) * wpmTarget))
  const transcript = buildTranscript()
  // Ensure transcript is long enough for the chosen wordCount; otherwise pad with another template.
  let result = transcript
  while (result.split(/\s+/).length < wordCount) result += ' ' + pick(SAMPLE_TEMPLATES).join(' ')
  const words = result.split(/\s+/).slice(0, wordCount)
  result = words.join(' ')

  const durationMs = Math.round(baseSeconds * 1000)
  const segments = buildSegments(result, durationMs)
  const fillers = buildFillers(result)
  const sentenceCount = (result.match(/[.?!]+/g)?.length ?? 1) || 1

  recordings.push({
    id: String(Math.floor(d.getTime() / 1000)),
    datetime: isoFromDate(d),
    modeName: mode,
    modelName: pick(MODELS),
    appVersion: '2.13.1',
    recordingDevice: pick(DEVICES),
    languageSelected: pick(LANGUAGES),
    duration: durationMs,
    processingTime: Math.round(between(400, 1800)),
    result,
    rawResult: result,
    segments,
    wordCount,
    wordsPerMinute: Math.round((wordCount / (durationMs / 1000)) * 60),
    sentenceCount,
    fillerCount: fillers.count,
    fillerBreakdown: fillers.breakdown,
    excerpt: result.slice(0, 200),
    waveform: buildWaveform(durationMs)
  })
}

recordings.sort((a, b) => (a.datetime < b.datetime ? 1 : -1))

// ---- Aggregates ---------------------------------------------------------

const totalDurationSec = recordings.reduce((s, r) => s + r.duration, 0) / 1000
const totalWords = recordings.reduce((s, r) => s + r.wordCount, 0)

const overview: OverviewStats = {
  totalRecordings: recordings.length,
  totalWords,
  totalDurationSec,
  avgWPM: Math.round((totalWords / totalDurationSec) * 60),
  avgDurationSec: totalDurationSec / recordings.length,
  dateRange: {
    start: recordings[recordings.length - 1]!.datetime,
    end: recordings[0]!.datetime
  },
  activeDays: new Set(recordings.map((r) => r.datetime.slice(0, 10))).size
}

const dailyMap = new Map<string, DailySummary>()
for (let i = 0; i <= DAYS_SPAN; i++) {
  const d = new Date(startMs + i * 24 * 3600 * 1000)
  const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  dailyMap.set(key, { date: key, count: 0, totalWords: 0, totalDurationSec: 0 })
}
for (const r of recordings) {
  const key = r.datetime.slice(0, 10)
  const cur = dailyMap.get(key)
  if (!cur) continue
  cur.count++
  cur.totalWords += r.wordCount
  cur.totalDurationSec += r.duration / 1000
}
const daily: DailySummary[] = Array.from(dailyMap.values())

// Mon-first ordering across the app — keeps the work-week visually
// contiguous in heatmaps and DOW bar charts. JS Date.getDay() is Sun-first
// (0..6 = Sun..Sat); mondayIndex remaps it to (0..6 = Mon..Sun).
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

const dowCounts: number[] = [0, 0, 0, 0, 0, 0, 0]
for (const r of recordings) {
  const d = mondayIndex(new Date(r.datetime))
  dowCounts[d] = (dowCounts[d] ?? 0) + 1
}
const dayOfWeek: DayOfWeekPattern[] = DAY_NAMES.map((name, day) => ({
  day,
  dayName: name,
  count: dowCounts[day] ?? 0
}))

const modeBuckets = new Map<string, ModeStat>()
for (const r of recordings) {
  const cur = modeBuckets.get(r.modeName) ?? {
    modeName: r.modeName,
    count: 0,
    totalWords: 0,
    totalDurationSec: 0,
    pct: 0
  }
  cur.count++
  cur.totalWords += r.wordCount
  cur.totalDurationSec += r.duration / 1000
  modeBuckets.set(r.modeName, cur)
}
const modeStats: ModeStat[] = Array.from(modeBuckets.values())
  .map((m) => ({ ...m, pct: m.count / recordings.length }))
  .sort((a, b) => b.count - a.count)

/**
 * Average WPM per mode, top six by recording count. Used by Usage's
 * "WPM by mode" tile and the matching chart-registry full-screen view.
 * Sorted by count (so the most-used mode is first), not WPM, because
 * the tile reads as "for the modes I actually use, how fast do I talk".
 */
const wpmByMode: Array<{ mode: string; avgWPM: number; count: number }> = modeStats
  .slice(0, 6)
  .map((m) => ({
    mode: m.modeName,
    avgWPM: m.totalDurationSec > 0 ? Math.round((m.totalWords / m.totalDurationSec) * 60) : 0,
    count: m.count
  }))

const wordCounts = new Map<string, number>()
for (const r of recordings) {
  for (const w of tokenise(r.result)) {
    wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1)
  }
}
const wordFrequency: WordFrequency[] = Array.from(wordCounts.entries())
  .map(([word, count]) => ({ word, count }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 50)

const fillerTotals = new Map<string, number>()
for (const r of recordings) {
  for (const f of r.fillerBreakdown) {
    fillerTotals.set(f.phrase, (fillerTotals.get(f.phrase) ?? 0) + f.count)
  }
}
const fillerSummary = Array.from(fillerTotals.entries())
  .map(([phrase, count]) => ({ phrase, count }))
  .sort((a, b) => b.count - a.count)

// ---- Usage aggregates ----------------------------------------------------

const hourly: HourlyPattern[] = Array.from({ length: 24 }, (_, h) => ({
  hour: h,
  count: 0,
  totalDurationSec: 0
}))
for (const r of recordings) {
  const h = new Date(r.datetime).getHours()
  hourly[h]!.count++
  hourly[h]!.totalDurationSec += r.duration / 1000
}

const heatmap: Heatmap = Array.from({ length: 7 }, () => Array(24).fill(0) as number[])
for (const r of recordings) {
  const d = new Date(r.datetime)
  const row = heatmap[mondayIndex(d)]
  if (!row) continue
  row[d.getHours()] = (row[d.getHours()] ?? 0) + 1
}

const DURATION_BUCKET_DEFS = [
  { label: '<10s', min: 0, max: 10 },
  { label: '10–30s', min: 10, max: 30 },
  { label: '30–60s', min: 30, max: 60 },
  { label: '1–2m', min: 60, max: 120 },
  { label: '2–5m', min: 120, max: 300 },
  { label: '5m+', min: 300, max: Infinity }
] as const
const durationDist: DurationBucket[] = DURATION_BUCKET_DEFS.map((b) => ({ ...b, count: 0 }))
for (const r of recordings) {
  const sec = r.duration / 1000
  const b = durationDist.find((b) => sec >= b.min && sec < b.max)
  if (b) b.count++
}

// Streaks ----------------------------------------------------------------

const sortedDays = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
let longestStreak = 0
{
  let run = 0
  for (const d of sortedDays) {
    if (d.count > 0) {
      run++
      if (run > longestStreak) longestStreak = run
    } else {
      run = 0
    }
  }
}
let currentStreak = 0
for (let i = sortedDays.length - 1; i >= 0; i--) {
  if ((sortedDays[i]?.count ?? 0) > 0) currentStreak++
  else break
}

const usage: UsageStats = {
  currentStreak,
  longestStreak,
  avgPerActiveDay: overview.totalRecordings / Math.max(1, overview.activeDays),
  timePerActiveDaySec: overview.totalDurationSec / Math.max(1, overview.activeDays)
}

// ---- Language aggregates -------------------------------------------------

function isoWeek(dt: Date): string {
  const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${pad(weekNum)}`
}

const wpmByMonth = new Map<string, { sumWords: number; sumSec: number }>()
for (const r of recordings) {
  const m = r.datetime.slice(0, 7) // YYYY-MM
  const cur = wpmByMonth.get(m) ?? { sumWords: 0, sumSec: 0 }
  cur.sumWords += r.wordCount
  cur.sumSec += r.duration / 1000
  wpmByMonth.set(m, cur)
}
const wpmTrend: TrendPoint[] = Array.from(wpmByMonth.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([period, v]) => ({ period, value: Math.round((v.sumWords / v.sumSec) * 60) }))

const fillerByWeek = new Map<string, { fillers: number; words: number }>()
for (const r of recordings) {
  const period = isoWeek(new Date(r.datetime))
  const cur = fillerByWeek.get(period) ?? { fillers: 0, words: 0 }
  cur.fillers += r.fillerCount
  cur.words += r.wordCount
  fillerByWeek.set(period, cur)
}
const fillerTrend: TrendPoint[] = Array.from(fillerByWeek.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([period, v]) => ({
    period,
    value: v.words > 0 ? +((v.fillers / v.words) * 100).toFixed(2) : 0
  }))

const SENTENCE_BUCKET_DEFS = [
  { label: '≤5', min: 0, max: 6 },
  { label: '6–10', min: 6, max: 11 },
  { label: '11–15', min: 11, max: 16 },
  { label: '16–20', min: 16, max: 21 },
  { label: '21–25', min: 21, max: 26 },
  { label: '25+', min: 26, max: Infinity }
] as const
const sentenceDist: SentenceBucket[] = SENTENCE_BUCKET_DEFS.map((b) => ({ ...b, count: 0 }))
for (const r of recordings) {
  if (r.sentenceCount > 0) {
    const avg = r.wordCount / r.sentenceCount
    const b = sentenceDist.find((b) => avg >= b.min && avg < b.max)
    if (b) b.count++
  }
}

// Vocabulary growth — cumulative unique words over time (by ISO week).
const recordingsByDate = recordings.slice().sort((a, b) => a.datetime.localeCompare(b.datetime))
const vocabSet = new Set<string>()
const vocabByWeek = new Map<string, number>()
for (const r of recordingsByDate) {
  const period = isoWeek(new Date(r.datetime))
  for (const w of tokenise(r.result)) vocabSet.add(w)
  vocabByWeek.set(period, vocabSet.size)
}
const vocabGrowth: TrendPoint[] = Array.from(vocabByWeek.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([period, value]) => ({ period, value }))

const totalSentences = recordings.reduce((s, r) => s + r.sentenceCount, 0)
const totalFillerCount = recordings.reduce((s, r) => s + r.fillerCount, 0)
const language: LanguageStats = {
  avgWPM: overview.avgWPM,
  fillerRatePct: totalWords > 0 ? +((totalFillerCount / totalWords) * 100).toFixed(2) : 0,
  vocabularyCount: wordCounts.size,
  avgSentenceLength: totalSentences > 0 ? +(totalWords / totalSentences).toFixed(1) : 0
}

// ---- Wave 2 additions ---------------------------------------------------

/** Trailing 30-day sparkline for each headline KPI. Used by KpiRow.
 *  Values run oldest → newest so the spark line reads left-to-right. */
const SPARK_DAYS = 30
const sparkRecent = sortedDays.slice(-SPARK_DAYS)

const sparklines: Record<'recordings' | 'words' | 'duration' | 'wpm', SparkSeries> = {
  recordings: {
    values: sparkRecent.map((d) => d.count),
    labels: sparkRecent.map((d) => d.date)
  },
  words: {
    values: sparkRecent.map((d) => d.totalWords),
    labels: sparkRecent.map((d) => d.date)
  },
  duration: {
    values: sparkRecent.map((d) => Math.round(d.totalDurationSec)),
    labels: sparkRecent.map((d) => d.date)
  },
  // Daily WPM, computed from the day's totals; fall back to the rolling avg
  // so the line stays continuous on quiet days.
  wpm: {
    values: sparkRecent.map((d) =>
      d.totalDurationSec > 0
        ? Math.round((d.totalWords / d.totalDurationSec) * 60)
        : overview.avgWPM
    ),
    labels: sparkRecent.map((d) => d.date)
  }
}

/** GitHub-style streak grid: every day in the last 365, with its count.
 *  Pads the head to align week boundaries (Mon-start). */
const STREAK_DAYS = 365
const streakStart = new Date(NOW.getTime() - (STREAK_DAYS - 1) * 24 * 3600 * 1000)
const streakCells: StreakCell[] = []
for (let i = 0; i < STREAK_DAYS; i++) {
  const d = new Date(streakStart.getTime() + i * 24 * 3600 * 1000)
  const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  streakCells.push({ date: key, count: dailyMap.get(key)?.count ?? 0 })
}

/** Per-day count by mode, for stacked-area / bar visualisations. */
const TOP_MODES_FOR_STACK = modeStats.slice(0, 5).map((m) => m.modeName)
const modeByDayMap = new Map<string, ModeByDay>()
for (const r of recordings) {
  const key = r.datetime.slice(0, 10)
  let cur = modeByDayMap.get(key)
  if (!cur) {
    cur = { date: key, modes: {} }
    modeByDayMap.set(key, cur)
  }
  const bucket = TOP_MODES_FOR_STACK.includes(r.modeName) ? r.modeName : 'Other'
  cur.modes[bucket] = (cur.modes[bucket] ?? 0) + 1
}
// Fill in zero-rows for empty days so the stack chart has dense X.
for (const d of sortedDays) {
  if (!modeByDayMap.has(d.date)) {
    modeByDayMap.set(d.date, { date: d.date, modes: {} })
  }
}
const modeByDay: ModeByDay[] = Array.from(modeByDayMap.values()).sort((a, b) =>
  a.date.localeCompare(b.date)
)
const stackModeKeys: string[] = [...TOP_MODES_FOR_STACK, 'Other']

/** Same shape as modeByDay but aggregated by ISO week — fewer points so it
 *  reads in a narrow column. */
const modeByWeekMap = new Map<string, ModeByDay>()
for (const day of modeByDay) {
  const period = isoWeek(new Date(day.date))
  let cur = modeByWeekMap.get(period)
  if (!cur) {
    cur = { date: period, modes: {} }
    modeByWeekMap.set(period, cur)
  }
  for (const [k, v] of Object.entries(day.modes)) {
    cur.modes[k] = (cur.modes[k] ?? 0) + v
  }
}
const modeByWeek: ModeByDay[] = Array.from(modeByWeekMap.values()).sort((a, b) =>
  a.date.localeCompare(b.date)
)

/** Flat shape Recharts wants — { date, [modeKey]: count, ... }. */
const modeByWeekFlat: Array<Record<string, unknown>> = modeByWeek.map((w) => {
  const row: Record<string, unknown> = { date: w.date }
  for (const k of stackModeKeys) row[k] = w.modes[k] ?? 0
  return row
})

/** Per-recording WPM scatter, keyed by month period to align with the
 *  monthly LineTrend on Speaking pace. */
const wpmDots: Array<{ period: string; value: number }> = recordings
  .map((r) => ({ period: r.datetime.slice(0, 7), value: r.wordsPerMinute }))
  .sort((a, b) => a.period.localeCompare(b.period))

export const mock = {
  recordings,
  overview,
  daily,
  dayOfWeek,
  modeStats,
  wordFrequency,
  fillerSummary,
  // wave 1.5
  hourly,
  heatmap,
  durationDist,
  usage,
  wpmTrend,
  fillerTrend,
  sentenceDist,
  vocabGrowth,
  language,
  // wave 2
  sparklines,
  streakCells,
  modeByDay,
  modeByWeek,
  modeByWeekFlat,
  stackModeKeys,
  wpmDots,
  // wave 4 polish
  wpmByMode
}
