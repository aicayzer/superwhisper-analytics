import type { Aggregates } from './types'

/**
 * Zero-state Aggregates. Used by:
 *   • `src/main/cache.ts` when the configured path is invalid or unset
 *   • `src/renderer/src/state/dataStore.ts` as the initial store value
 *     (so screens render empty-but-valid before the first hydrate)
 *
 * Lives in `@shared/` so both processes consume the same factory and
 * the shape stays in lockstep with `Aggregates`.
 */
export function emptyAggregates(): Aggregates {
  return {
    overview: {
      totalRecordings: 0,
      totalWords: 0,
      totalDurationSec: 0,
      avgWPM: 0,
      avgDurationSec: 0,
      dateRange: { start: '', end: '' },
      activeDays: 0
    },
    daily: [],
    dayOfWeek: [
      { day: 0, dayName: 'Mon', count: 0 },
      { day: 1, dayName: 'Tue', count: 0 },
      { day: 2, dayName: 'Wed', count: 0 },
      { day: 3, dayName: 'Thu', count: 0 },
      { day: 4, dayName: 'Fri', count: 0 },
      { day: 5, dayName: 'Sat', count: 0 },
      { day: 6, dayName: 'Sun', count: 0 }
    ],
    modeStats: [],
    wordFrequency: [],
    fillerSummary: [],
    heatmap: Array.from({ length: 7 }, () => Array(24).fill(0) as number[]),
    durationDist: [],
    usage: {
      currentStreak: 0,
      longestStreak: 0,
      avgPerActiveDay: 0,
      timePerActiveDaySec: 0
    },
    wpmTrend: [],
    fillerTrend: [],
    sentenceDist: [],
    vocabGrowth: [],
    language: {
      avgWPM: 0,
      fillerRatePct: 0,
      vocabularyCount: 0,
      avgSentenceLength: 0
    },
    sparklines: {
      recordings: { values: [], labels: [] },
      words: { values: [], labels: [] },
      duration: { values: [], labels: [] },
      wpm: { values: [], labels: [] }
    },
    streakCells: [],
    modeByDay: [],
    modeByWeek: [],
    modeByWeekFlat: [],
    stackModeKeys: [],
    wpmDots: []
  }
}
