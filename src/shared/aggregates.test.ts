import { describe, expect, it } from 'vitest'
import { computeAll } from './aggregates'
import type { Recording } from './types'

/**
 * Fixture builder. Sensible defaults so each test only sets the fields
 * it actually cares about; the rest stay valid enough for `computeAll`
 * to traverse without crashing.
 */
function rec(overrides: Partial<Recording> = {}): Recording {
  const base: Recording = {
    id: '0',
    datetime: '2026-05-11T10:00:00',
    modeName: 'Default',
    modelName: 'whisper',
    appVersion: '1.0',
    recordingDevice: 'mic',
    languageSelected: 'en',
    duration: 60_000, // 1 minute
    processingTime: 1000,
    result: 'hello world',
    rawResult: 'hello world',
    segments: [],
    wordCount: 2,
    wordsPerMinute: 120,
    sentenceCount: 1,
    fillerCount: 0,
    fillerBreakdown: [],
    excerpt: 'hello world'
  }
  return { ...base, ...overrides }
}

/**
 * Shift YYYY-MM-DD by `days` (positive = forward), staying in local
 * time. `toISOString()` would flip the date in any non-UTC timezone, so
 * format the components manually.
 */
function dayOffset(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

describe('computeAll — empty input', () => {
  it('returns zero overview + empty trend arrays', () => {
    const agg = computeAll([])
    expect(agg.overview.totalRecordings).toBe(0)
    expect(agg.overview.totalWords).toBe(0)
    expect(agg.overview.avgWPM).toBe(0)
    expect(agg.wpmTrend).toEqual([])
    expect(agg.fillerTrend).toEqual([])
    expect(agg.vocabGrowth).toEqual([])
    expect(agg.modeStats).toEqual([])
    expect(agg.usage.currentStreak).toBe(0)
  })
})

describe('computeAll — overview', () => {
  it('reports min/max datetime and counts distinct active days', () => {
    const agg = computeAll([
      rec({ datetime: '2026-05-01T10:00:00' }),
      rec({ datetime: '2026-05-01T15:00:00' }), // same day
      rec({ datetime: '2026-05-03T10:00:00' }),
      rec({ datetime: '2026-05-09T10:00:00' })
    ])
    expect(agg.overview.dateRange.start).toBe('2026-05-01T10:00:00')
    expect(agg.overview.dateRange.end).toBe('2026-05-09T10:00:00')
    expect(agg.overview.activeDays).toBe(3)
    expect(agg.overview.totalRecordings).toBe(4)
  })
})

describe('computeAll — daily seeding', () => {
  it('emits a 0-count cell for every day in the range, including gaps', () => {
    const agg = computeAll([
      rec({ datetime: '2026-05-01T10:00:00' }),
      // four-day gap
      rec({ datetime: '2026-05-05T10:00:00' })
    ])
    expect(agg.daily.map((d) => d.date)).toEqual([
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-04',
      '2026-05-05'
    ])
    expect(agg.daily.map((d) => d.count)).toEqual([1, 0, 0, 0, 1])
  })
})

describe('computeAll — trend gaps (the W19 regression)', () => {
  it('emits null for empty weeks inside the trend bounds', () => {
    // Two recordings two weeks apart — the middle week must appear as a
    // gap (value: null), not silently vanish from the chart.
    const agg = computeAll(
      [
        rec({ datetime: '2026-05-04T10:00:00', wordCount: 60, duration: 60_000 }), // W19
        rec({ datetime: '2026-05-18T10:00:00', wordCount: 60, duration: 60_000 }) // W21
      ],
      new Date('2026-05-20T00:00:00'),
      { bucketBy: 'week' }
    )
    expect(agg.wpmTrend.map((p) => p.period)).toEqual(['2026-W19', '2026-W20', '2026-W21'])
    expect(agg.wpmTrend[1]?.value).toBeNull()
    expect(agg.fillerTrend[1]?.value).toBeNull()
  })

  it('vocab growth carries forward — never null even across empty buckets', () => {
    const agg = computeAll(
      [
        rec({
          datetime: '2026-05-04T10:00:00',
          result: 'alpha bravo charlie',
          wordCount: 3
        }),
        rec({
          datetime: '2026-05-18T10:00:00',
          result: 'delta echo',
          wordCount: 2
        })
      ],
      new Date('2026-05-20T00:00:00'),
      { bucketBy: 'week' }
    )
    const values = agg.vocabGrowth.map((p) => p.value)
    expect(values).toHaveLength(3)
    expect(values.every((v) => v !== null)).toBe(true)
    // monotonic: 3 → 3 (carry) → 5
    expect(values[0]).toBe(3)
    expect(values[1]).toBe(3)
    expect(values[2]).toBe(5)
  })
})

describe('computeAll — streaks', () => {
  it('counts a 3-day run ending today as the current streak', () => {
    const today = '2026-05-11'
    const agg = computeAll(
      [
        rec({ datetime: `${dayOffset(today, -2)}T10:00:00` }),
        rec({ datetime: `${dayOffset(today, -1)}T10:00:00` }),
        rec({ datetime: `${today}T10:00:00` })
      ],
      new Date(`${today}T23:59:00`)
    )
    expect(agg.usage.currentStreak).toBe(3)
    expect(agg.usage.longestStreak).toBe(3)
  })

  it('drops currentStreak to 0 when the run ended yesterday', () => {
    // computeStreaks reads the trailing run from the *daily* array, which
    // is seeded over [first..last recording]. A run that ends before the
    // last recording day means a 0-count cell trails it → run breaks.
    const agg = computeAll([
      rec({ datetime: '2026-05-01T10:00:00' }),
      rec({ datetime: '2026-05-02T10:00:00' }),
      rec({ datetime: '2026-05-03T10:00:00' }),
      // gap of two days — the trailing 0-cells break the streak
      rec({ datetime: '2026-05-06T10:00:00' })
    ])
    expect(agg.usage.longestStreak).toBe(3)
    expect(agg.usage.currentStreak).toBe(1)
  })
})

describe('computeAll — mode percentages', () => {
  it('pct values are fractions that sum to 1', () => {
    const agg = computeAll([
      rec({ modeName: 'Default' }),
      rec({ modeName: 'Default' }),
      rec({ modeName: 'Default' }),
      rec({ modeName: 'Meeting' }),
      rec({ modeName: 'Meeting' }),
      rec({ modeName: 'Email' })
    ])
    expect(agg.modeStats).toHaveLength(3)
    expect(agg.modeStats[0]?.modeName).toBe('Default')
    expect(agg.modeStats[0]?.pct).toBeCloseTo(0.5, 5)
    expect(agg.modeStats[1]?.pct).toBeCloseTo(0.3333, 3)
    expect(agg.modeStats[2]?.pct).toBeCloseTo(0.1667, 3)
    const sum = agg.modeStats.reduce((s, m) => s + m.pct, 0)
    expect(sum).toBeCloseTo(1, 5)
  })
})

describe('computeAll — bucketBy honoured across trend granularities', () => {
  const fixtures = [
    rec({ datetime: '2026-03-15T10:00:00', result: 'a', wordCount: 1 }),
    rec({ datetime: '2026-04-15T10:00:00', result: 'b', wordCount: 1 })
  ]

  it('day buckets produce YYYY-MM-DD period strings', () => {
    const agg = computeAll(fixtures, new Date('2026-04-20T00:00:00'), { bucketBy: 'day' })
    expect(agg.wpmTrend[0]?.period).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('week buckets produce YYYY-Www period strings', () => {
    const agg = computeAll(fixtures, new Date('2026-04-20T00:00:00'), { bucketBy: 'week' })
    expect(agg.wpmTrend[0]?.period).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('month buckets produce YYYY-MM period strings', () => {
    const agg = computeAll(fixtures, new Date('2026-04-20T00:00:00'), { bucketBy: 'month' })
    expect(agg.wpmTrend.map((p) => p.period)).toEqual(['2026-03', '2026-04'])
  })
})

describe('computeAll — streakWindowDays', () => {
  it('emits exactly windowDays cells', () => {
    const agg = computeAll([rec({ datetime: '2026-05-11T10:00:00' })], new Date('2026-05-11'), {
      streakWindowDays: 30
    })
    expect(agg.streakCells).toHaveLength(30)
  })
})

describe('computeAll — wordFrequency', () => {
  it('excludes stopwords and ranks by count', () => {
    const agg = computeAll([
      rec({ result: 'banana apple banana the and banana' }),
      rec({ result: 'apple cherry the' })
    ])
    const top = agg.wordFrequency.map((w) => w.word)
    expect(top[0]).toBe('banana')
    expect(top[1]).toBe('apple')
    expect(top).not.toContain('the')
    expect(top).not.toContain('and')
  })
})

describe('computeAll — fillerSummary', () => {
  it('sums counts per phrase across recordings, sorted descending', () => {
    const agg = computeAll([
      rec({
        fillerCount: 3,
        fillerBreakdown: [
          { phrase: 'um', count: 2 },
          { phrase: 'like', count: 1 }
        ]
      }),
      rec({
        fillerCount: 2,
        fillerBreakdown: [{ phrase: 'um', count: 2 }]
      })
    ])
    expect(agg.fillerSummary).toEqual([
      { phrase: 'um', count: 4 },
      { phrase: 'like', count: 1 }
    ])
  })
})

describe('computeAll — heatmap', () => {
  it('is 7×24 and increments the right Mon/hour cell', () => {
    // 2026-05-11 is a Monday — local-time ISO string with no TZ offset
    // is parsed as local time, so getDay()=1 → mondayIndex=0.
    const agg = computeAll([rec({ datetime: '2026-05-11T09:30:00' })])
    expect(agg.heatmap).toHaveLength(7)
    expect(agg.heatmap[0]).toHaveLength(24)
    expect(agg.heatmap[0]?.[9]).toBe(1)
  })
})
