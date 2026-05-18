import { describe, expect, it } from 'vitest'
import type { Recording } from '@shared/types'
import {
  authoredRecordingStarter,
  bindingFingerprint,
  defaultBundledRecordingBinding,
  defaultRecordingFieldMap,
  type MappingBinding
} from './mapping'
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

const bundled = defaultBundledRecordingBinding()

describe('projectRecording — bundled mapping', () => {
  it('maps the Superwhisper recording into the bundled item shape', () => {
    const p = projectRecording(makeRecording(), bundled)
    expect(p.type).toBe('superwhisper.recording')
    expect(p.source).toBe('superwhisper-analytics')
    expect(p.source_id).toBe('1755164573')
    expect(p.tier).toBe('feed')
    expect(p.properties.body).toBe('Hello world.')
    expect(p.properties.raw_result).toBe('hello world')
    expect(p.properties.duration_seconds).toBe(4.5)
    expect(p.properties.segments).toEqual([{ start: 0, end: 1.5, text: 'hello' }])
    expect(p.properties.datetime).toBe('2026-05-11T10:00:00')
    expect(p.properties.language).toBe('en')
  })

  it('drops blank language so it does not override the inherited field', () => {
    const p = projectRecording(makeRecording({ languageSelected: '' }), bundled)
    expect(p.properties.language).toBeUndefined()
  })

  it('omits derived analytics fields from the wire shape', () => {
    const p = projectRecording(makeRecording(), bundled)
    expect(Object.keys(p.properties).sort()).toEqual(
      [
        'app_version',
        'body',
        'datetime',
        'duration_seconds',
        'input_device',
        'language',
        'mode',
        'model',
        'raw_result',
        'segments'
      ].sort()
    )
  })

  it('uses the bare recording id as source_id when bundled', () => {
    const p = projectRecording(makeRecording(), bundled)
    expect(p.source_id).toBe('1755164573')
    expect(p.source_id).not.toContain('#')
  })
})

describe('projectRecording — authored mapping', () => {
  const authored: MappingBinding = (() => {
    const schema = authoredRecordingStarter('eval.recording', 'Eval recording')
    return {
      mode: 'authored',
      typeId: schema.id,
      fieldMap: defaultRecordingFieldMap(schema),
      authoredSchema: schema
    }
  })()

  it('uses the authored type id', () => {
    const p = projectRecording(makeRecording(), authored)
    expect(p.type).toBe('eval.recording')
  })

  it('appends the binding fingerprint to source_id', () => {
    const p = projectRecording(makeRecording(), authored)
    const fp = bindingFingerprint(authored)
    expect(p.source_id).toBe(`1755164573#${fp}`)
    expect(fp).not.toBe('b')
    expect(fp).toHaveLength(8)
  })

  it('emits properties for fields with auto-paired source refs', () => {
    const p = projectRecording(makeRecording(), authored)
    // authoredRecordingStarter declares raw_result, duration_seconds,
    // model, mode, device, datetime; defaultRecordingFieldMap also adds
    // body/title/language because parent === core.note.
    expect(p.properties).toMatchObject({
      raw_result: 'hello world',
      duration_seconds: 4.5,
      model: 'medium',
      mode: 'dictation',
      device: 'Built-in',
      datetime: '2026-05-11T10:00:00',
      body: 'Hello world.',
      title: 'Hello world.',
      language: 'en'
    })
  })
})

describe('hashProjection', () => {
  it('produces a stable hash for the same input', () => {
    const a = projectRecording(makeRecording(), bundled)
    const b = projectRecording(makeRecording(), bundled)
    expect(hashProjection(a)).toBe(hashProjection(b))
  })

  it('is independent of property declaration order', () => {
    const original = projectRecording(makeRecording(), bundled)
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
    const a = projectRecording(makeRecording({ result: 'Hello' }), bundled)
    const b = projectRecording(makeRecording({ result: 'Goodbye' }), bundled)
    expect(hashProjection(a)).not.toBe(hashProjection(b))
  })

  it('treats undefined the same as missing (canonical drop)', () => {
    expect(hashProjection({ a: 1, b: undefined })).toBe(hashProjection({ a: 1 }))
  })
})
