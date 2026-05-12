import { describe, expect, it } from 'vitest'
import { filterByRange } from './range'
import type { Recording } from './types'

function rec(datetime: string): Recording {
  return {
    id: datetime,
    datetime,
    modeName: 'Default',
    modelName: 'whisper',
    appVersion: '1.0',
    recordingDevice: 'mic',
    languageSelected: 'en',
    duration: 60_000,
    processingTime: 0,
    result: '',
    rawResult: '',
    segments: [],
    wordCount: 0,
    wordsPerMinute: 0,
    sentenceCount: 0,
    fillerCount: 0,
    fillerBreakdown: [],
    excerpt: ''
  }
}

const sample = [
  rec('2026-01-01T10:00:00'),
  rec('2026-03-15T10:00:00'),
  rec('2026-05-11T10:00:00'),
  // Invalid datetime — should be filtered out when any bound is set,
  // and not crash when no bounds are set (just passed through).
  rec('not-a-date')
]

describe('filterByRange', () => {
  it('returns input untouched when both bounds are absent', () => {
    expect(filterByRange(sample, {})).toBe(sample)
  })

  it('respects a `from`-only bound (inclusive)', () => {
    const out = filterByRange(sample, { from: new Date('2026-03-01T00:00:00') })
    expect(out.map((r) => r.datetime)).toEqual(['2026-03-15T10:00:00', '2026-05-11T10:00:00'])
  })

  it('respects a `to`-only bound (inclusive)', () => {
    const out = filterByRange(sample, { to: new Date('2026-03-31T23:59:59') })
    expect(out.map((r) => r.datetime)).toEqual(['2026-01-01T10:00:00', '2026-03-15T10:00:00'])
  })

  it('drops recordings with invalid datetime strings when a bound is set', () => {
    const out = filterByRange(sample, { from: new Date('2025-01-01T00:00:00') })
    expect(out.find((r) => r.datetime === 'not-a-date')).toBeUndefined()
  })
})
