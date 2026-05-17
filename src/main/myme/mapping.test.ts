import { describe, expect, it } from 'vitest'
import {
  authoredRecordingStarter,
  bindingFingerprint,
  defaultBundledRecordingBinding,
  defaultBundledSessionBinding,
  defaultMapping,
  defaultRecordingFieldMap,
  defaultSessionFieldMap,
  type MappingBinding
} from './mapping'
import { SUPERWHISPER_RECORDING, SUPERWHISPER_SESSION } from './schemas'

describe('defaultMapping', () => {
  it('points both source kinds at the bundled types by default', () => {
    const m = defaultMapping()
    expect(m.recording.mode).toBe('bundled')
    expect(m.recording.typeId).toBe(SUPERWHISPER_RECORDING.id)
    expect(m.session.mode).toBe('bundled')
    expect(m.session.typeId).toBe(SUPERWHISPER_SESSION.id)
  })

  it('emits independent field-map copies so callers can mutate safely', () => {
    const a = defaultMapping()
    const b = defaultMapping()
    a.recording.fieldMap.body = { kind: 'literal', value: 'mutated' }
    expect(b.recording.fieldMap.body).toEqual({
      kind: 'source',
      field: 'recording.transcript'
    })
  })
})

describe('bindingFingerprint', () => {
  it('returns the bundled sentinel for bundled bindings', () => {
    expect(bindingFingerprint(defaultBundledRecordingBinding())).toBe('b')
    expect(bindingFingerprint(defaultBundledSessionBinding())).toBe('b')
  })

  it('returns an 8-char hex slice for non-bundled bindings', () => {
    const schema = authoredRecordingStarter('eval.recording')
    const binding: MappingBinding = {
      mode: 'authored',
      typeId: schema.id,
      fieldMap: defaultRecordingFieldMap(schema),
      authoredSchema: schema
    }
    const fp = bindingFingerprint(binding)
    expect(fp).toMatch(/^[0-9a-f]{8}$/)
    expect(fp).not.toBe('b')
  })

  it('changes when the field map changes', () => {
    const schema = authoredRecordingStarter('eval.recording')
    const binding: MappingBinding = {
      mode: 'authored',
      typeId: schema.id,
      fieldMap: defaultRecordingFieldMap(schema),
      authoredSchema: schema
    }
    const before = bindingFingerprint(binding)
    const after = bindingFingerprint({
      ...binding,
      fieldMap: { ...binding.fieldMap, extra: { kind: 'literal', value: 'x' } }
    })
    expect(after).not.toBe(before)
  })

  it('changes when the type id changes', () => {
    const schema = authoredRecordingStarter('eval.recording')
    const binding: MappingBinding = {
      mode: 'authored',
      typeId: schema.id,
      fieldMap: defaultRecordingFieldMap(schema),
      authoredSchema: schema
    }
    const before = bindingFingerprint(binding)
    const after = bindingFingerprint({ ...binding, typeId: 'eval.other' })
    expect(after).not.toBe(before)
  })

  it('is stable across field-map key order', () => {
    const binding: MappingBinding = {
      mode: 'authored',
      typeId: 'eval.foo',
      fieldMap: {
        a: { kind: 'source', field: 'recording.mode' },
        b: { kind: 'source', field: 'recording.model' }
      }
    }
    const reversed: MappingBinding = {
      ...binding,
      fieldMap: {
        b: { kind: 'source', field: 'recording.model' },
        a: { kind: 'source', field: 'recording.mode' }
      }
    }
    expect(bindingFingerprint(binding)).toBe(bindingFingerprint(reversed))
  })
})

describe('defaultRecordingFieldMap', () => {
  it('returns the canonical bundled layout for the bundled type', () => {
    const map = defaultRecordingFieldMap(SUPERWHISPER_RECORDING)
    expect(map.body).toEqual({ kind: 'source', field: 'recording.transcript' })
    expect(map.raw_result).toEqual({
      kind: 'source',
      field: 'recording.rawTranscript'
    })
    expect(map.duration_seconds).toEqual({
      kind: 'source',
      field: 'recording.durationSeconds'
    })
  })

  it('auto-pairs declared fields via the alias table', () => {
    const map = defaultRecordingFieldMap({
      id: 'eval.r',
      version: 1,
      fields: {
        body: { type: 'string' },
        duration_seconds: { type: 'number' },
        mode: { type: 'string' },
        appVersion: { type: 'string' }
      }
    })
    expect(map.body).toEqual({ kind: 'source', field: 'recording.transcript' })
    expect(map.duration_seconds).toEqual({
      kind: 'source',
      field: 'recording.durationSeconds'
    })
    expect(map.mode).toEqual({ kind: 'source', field: 'recording.mode' })
    // appVersion isn't in the alias table (snake_case `app_version` is);
    // it stays unmapped. The override UI lets the user wire it.
    expect(map.appVersion).toBeUndefined()
  })

  it('adds inherited core.note landing pads when parent === core.note', () => {
    const map = defaultRecordingFieldMap({
      id: 'eval.r',
      version: 1,
      parent: 'core.note',
      fields: {}
    })
    expect(map.body).toEqual({ kind: 'source', field: 'recording.transcript' })
    expect(map.title).toEqual({ kind: 'source', field: 'recording.excerpt' })
    expect(map.language).toEqual({ kind: 'source', field: 'recording.language' })
  })

  it('leaves fields with no alias unmapped', () => {
    const map = defaultRecordingFieldMap({
      id: 'eval.r',
      version: 1,
      fields: {
        unrelated_metric: { type: 'number' }
      }
    })
    expect(map.unrelated_metric).toBeUndefined()
  })
})

describe('defaultSessionFieldMap', () => {
  it('returns the canonical bundled layout for the bundled session type', () => {
    const map = defaultSessionFieldMap(SUPERWHISPER_SESSION)
    expect(map.started_at).toEqual({ kind: 'source', field: 'session.startedAt' })
    expect(map.recording_count).toEqual({
      kind: 'source',
      field: 'session.recordingCount'
    })
  })

  it('auto-pairs declared fields via the alias table', () => {
    const map = defaultSessionFieldMap({
      id: 'eval.s',
      version: 1,
      fields: {
        title: { type: 'string' },
        started_at: { type: 'datetime' },
        recording_count: { type: 'number' }
      }
    })
    expect(map.title).toEqual({ kind: 'source', field: 'session.sourceId' })
    expect(map.started_at).toEqual({ kind: 'source', field: 'session.startedAt' })
    expect(map.recording_count).toEqual({
      kind: 'source',
      field: 'session.recordingCount'
    })
  })
})

describe('authoredRecordingStarter', () => {
  it('seeds a sensible default field set for a user-authored type', () => {
    const schema = authoredRecordingStarter('eval.recording', 'My recording')
    expect(schema.id).toBe('eval.recording')
    expect(schema.label).toBe('My recording')
    expect(schema.version).toBe(1)
    expect(schema.parent).toBe('core.note')
    expect(Object.keys(schema.fields ?? {})).toEqual(
      expect.arrayContaining([
        'raw_result',
        'duration_seconds',
        'mode',
        'model',
        'device',
        'datetime'
      ])
    )
  })
})
