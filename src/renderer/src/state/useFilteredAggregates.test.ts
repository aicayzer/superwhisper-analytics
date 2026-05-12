import { describe, expect, it } from 'vitest'
import type { Recording } from '@shared/types'
import { datasetSpanDays, pickBucketBy } from './useFilteredAggregates'

/**
 * The hook itself is glue around `computeAll` + zustand selectors; the
 * logic worth pinning down is the two pure helpers that decide trend
 * granularity from the active range. Both are exported for direct
 * unit-testing.
 */

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

describe('pickBucketBy', () => {
  it('returns day for short windows', () => {
    expect(pickBucketBy(1)).toBe('day')
    expect(pickBucketBy(7)).toBe('day')
    expect(pickBucketBy(29)).toBe('day')
  })

  it('returns week for mid-range windows', () => {
    expect(pickBucketBy(30)).toBe('week')
    expect(pickBucketBy(60)).toBe('week')
    expect(pickBucketBy(90)).toBe('week')
  })

  it('returns month for long windows', () => {
    expect(pickBucketBy(91)).toBe('month')
    expect(pickBucketBy(180)).toBe('month')
    expect(pickBucketBy(365)).toBe('month')
    expect(pickBucketBy(1000)).toBe('month')
  })
})

describe('datasetSpanDays', () => {
  it('returns 0 for an empty dataset', () => {
    expect(datasetSpanDays([])).toBe(0)
  })

  it('returns at least 1 for a single recording (no zero-span)', () => {
    expect(datasetSpanDays([rec('2026-05-11T10:00:00')])).toBe(1)
  })

  it('returns the span across multiple recordings', () => {
    expect(datasetSpanDays([rec('2026-05-01T10:00:00'), rec('2026-05-15T10:00:00')])).toBe(14)
  })

  it('ignores recordings with invalid datetime strings', () => {
    expect(
      datasetSpanDays([rec('2026-05-01T10:00:00'), rec('not-a-date'), rec('2026-05-15T10:00:00')])
    ).toBe(14)
  })
})
