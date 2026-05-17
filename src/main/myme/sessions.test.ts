import { describe, expect, it } from 'vitest'
import type { Recording } from '@shared/types'
import { DEFAULT_GAP_THRESHOLD_MINUTES, groupIntoSessions } from './sessions'

function makeRecording(over: Partial<Recording> = {}): Recording {
  return {
    id: '1000000000',
    datetime: '2026-05-11T10:00:00Z',
    modeName: 'dictation',
    modelName: 'medium',
    appVersion: '3.0.0',
    recordingDevice: 'Built-in',
    languageSelected: 'en',
    duration: 60_000, // 60s
    processingTime: 1000,
    result: '',
    rawResult: '',
    segments: [],
    wordCount: 0,
    wordsPerMinute: 0,
    sentenceCount: 0,
    fillerCount: 0,
    fillerBreakdown: [],
    excerpt: '',
    ...over
  }
}

describe('groupIntoSessions', () => {
  it('returns an empty array for empty input', () => {
    expect(groupIntoSessions([])).toEqual([])
  })

  it('groups recordings within the gap threshold into one session', () => {
    // Three recordings, each 1 min long, 10 min apart — well under the
    // default 30 min threshold so all share one session.
    const groups = groupIntoSessions([
      makeRecording({ id: 'A', datetime: '2026-05-11T10:00:00Z' }),
      makeRecording({ id: 'B', datetime: '2026-05-11T10:11:00Z' }),
      makeRecording({ id: 'C', datetime: '2026-05-11T10:22:00Z' })
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.recordingIds).toEqual(['A', 'B', 'C'])
    expect(groups[0]?.recordingCount).toBe(3)
    expect(groups[0]?.sourceId).toBe(`A-${DEFAULT_GAP_THRESHOLD_MINUTES}`)
  })

  it('starts a new session when the gap exceeds the threshold', () => {
    // Two recordings 31 min apart with a 30 min threshold → two sessions.
    const groups = groupIntoSessions(
      [
        makeRecording({ id: 'A', datetime: '2026-05-11T10:00:00Z' }),
        makeRecording({ id: 'B', datetime: '2026-05-11T10:32:00Z' })
      ],
      30
    )
    expect(groups).toHaveLength(2)
    expect(groups[0]?.recordingIds).toEqual(['A'])
    expect(groups[1]?.recordingIds).toEqual(['B'])
  })

  it('uses recording end time, not start time, for gap measurement', () => {
    // A long-running recording (10 min) then a short one starting 5 min
    // after its end → 5 min gap, well under threshold; one session.
    const groups = groupIntoSessions(
      [
        makeRecording({ id: 'A', datetime: '2026-05-11T10:00:00Z', duration: 10 * 60_000 }),
        makeRecording({ id: 'B', datetime: '2026-05-11T10:15:00Z' })
      ],
      10
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.recordingCount).toBe(2)
  })

  it('source_id changes when the threshold changes', () => {
    const recordings = [makeRecording({ id: 'X' })]
    const groupsAt30 = groupIntoSessions(recordings, 30)
    const groupsAt45 = groupIntoSessions(recordings, 45)
    expect(groupsAt30[0]?.sourceId).toBe('X-30')
    expect(groupsAt45[0]?.sourceId).toBe('X-45')
  })

  it('picks the most-used mode as dominantMode, with first-seen tie-break', () => {
    const groups = groupIntoSessions([
      makeRecording({ id: 'A', datetime: '2026-05-11T10:00:00Z', modeName: 'dictation' }),
      makeRecording({ id: 'B', datetime: '2026-05-11T10:05:00Z', modeName: 'command' }),
      makeRecording({ id: 'C', datetime: '2026-05-11T10:10:00Z', modeName: 'dictation' })
    ])
    expect(groups[0]?.dominantMode).toBe('dictation')
  })

  it('falls back to first-seen mode on tie', () => {
    // Two recordings, two different modes: dictation wins because it
    // appeared first in chronological order.
    const groups = groupIntoSessions([
      makeRecording({ id: 'A', datetime: '2026-05-11T10:00:00Z', modeName: 'dictation' }),
      makeRecording({ id: 'B', datetime: '2026-05-11T10:05:00Z', modeName: 'command' })
    ])
    expect(groups[0]?.dominantMode).toBe('dictation')
  })

  it('computes totalDurationSeconds as the sum of constituent durations', () => {
    const groups = groupIntoSessions([
      makeRecording({ id: 'A', datetime: '2026-05-11T10:00:00Z', duration: 60_000 }),
      makeRecording({ id: 'B', datetime: '2026-05-11T10:05:00Z', duration: 120_000 })
    ])
    expect(groups[0]?.totalDurationSeconds).toBe(180) // 60s + 120s
  })

  it('sorts input by datetime before grouping', () => {
    // Out-of-order input: the function should sort by datetime
    // ascending before walking the gap boundaries.
    const groups = groupIntoSessions([
      makeRecording({ id: 'C', datetime: '2026-05-11T11:00:00Z' }),
      makeRecording({ id: 'A', datetime: '2026-05-11T10:00:00Z' }),
      makeRecording({ id: 'B', datetime: '2026-05-11T10:05:00Z' })
    ])
    expect(groups[0]?.recordingIds[0]).toBe('A')
    expect(groups[0]?.recordingIds).toContain('A')
  })
})
