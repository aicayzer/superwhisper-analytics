import { describe, expect, it } from 'vitest'
import type { Recording } from '@shared/types'
import { hashProjection, projectRecording } from './projection'

function makeRecording(over: Partial<Recording> = {}): Recording {
  return {
    id: '1755164573',
    datetime: '2026-05-11T10:00:00',
    modeName: 'dictation',
    modelName: 'medium',
    appVersion: '3.0.0',
    recordingDevice: 'Built-in',
    languageSelected: 'en',
    duration: 4500,
    processingTime: 1200,
    result: 'Hello world.',
    rawResult: 'hello world',
    segments: [{ start: 0, end: 1.5, text: 'hello' }],
    wordCount: 2,
    wordsPerMinute: 26.6,
    sentenceCount: 1,
    fillerCount: 0,
    fillerBreakdown: [],
    excerpt: 'Hello world.',
    ...over
  }
}

describe('projectRecording', () => {
  it('maps the Superwhisper recording into the Myme item shape', () => {
    const p = projectRecording(makeRecording())
    expect(p.type).toBe('superwhisper.recording')
    expect(p.source).toBe('superwhisper-analytics')
    expect(p.source_id).toBe('1755164573')
    expect(p.tier).toBe('feed')
    expect(p.properties.body).toBe('Hello world.')
    expect(p.properties.raw_result).toBe('hello world')
    expect(p.properties.duration_seconds).toBe(4.5) // duration_ms / 1000
    expect(p.properties.segments).toEqual([{ start: 0, end: 1.5, text: 'hello' }])
    expect(p.properties.datetime).toBe('2026-05-11T10:00:00')
    expect(p.properties.language).toBe('en')
  })

  it('drops blank language so it doesn’t override the inherited field', () => {
    const p = projectRecording(makeRecording({ languageSelected: '' }))
    expect(p.properties.language).toBeUndefined()
  })

  it('omits derived analytics fields (filler counts, WPM) from the wire shape', () => {
    const p = projectRecording(makeRecording())
    expect(Object.keys(p.properties).sort()).toEqual(
      [
        'app_version',
        'body',
        'datetime',
        'device',
        'duration_seconds',
        'language',
        'mode',
        'model',
        'raw_result',
        'segments'
      ].sort()
    )
  })
})

describe('hashProjection', () => {
  it('produces a stable hash for the same input', () => {
    const a = projectRecording(makeRecording())
    const b = projectRecording(makeRecording())
    expect(hashProjection(a)).toBe(hashProjection(b))
  })

  it('is independent of property declaration order', () => {
    const original = projectRecording(makeRecording())
    // Re-order top-level keys to simulate a payload coming from a
    // different code path. The canonical stringify should walk keys
    // sorted, so the hash matches.
    const shuffled = {
      properties: original.properties,
      tier: original.tier,
      source_id: original.source_id,
      type: original.type,
      source: original.source
    }
    expect(hashProjection(shuffled)).toBe(hashProjection(original))
  })

  it('changes when a field changes', () => {
    const a = projectRecording(makeRecording({ result: 'Hello' }))
    const b = projectRecording(makeRecording({ result: 'Goodbye' }))
    expect(hashProjection(a)).not.toBe(hashProjection(b))
  })

  it('treats undefined the same as missing (canonical drop)', () => {
    expect(hashProjection({ a: 1, b: undefined })).toBe(hashProjection({ a: 1 }))
  })
})
