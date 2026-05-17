import { createHash } from 'crypto'
import type { Recording } from '@shared/types'
import { bindingFingerprint, isBundled, type MappingBinding, type SourceFieldRef } from './mapping'
import { SOURCE } from './schemas'
import type { SessionGroup } from './sessions'

/**
 * Pure mapping layer — given a local source object and a `MappingBinding`,
 * produce the Myme item payload that gets pushed.
 *
 * `source_id` is derived from the source identifier plus the binding
 * fingerprint. Bundled bindings emit the bare source identifier (so
 * existing data stays valid mid-migration); non-bundled bindings get a
 * `#<fp>` suffix that flips when the binding changes, driving
 * trash-and-re-mint on the next sync. See `mapping.ts` for the
 * fingerprint rules.
 *
 * `properties` is built from the binding's field map: each entry pulls
 * a value off the source object (or a literal) and lands under the
 * target field name. Undefined / empty-string values are dropped so a
 * sparse mapping doesn't write empty strings into Myme fields.
 */

export interface Projection {
  type: string
  source: string
  source_id: string
  tier: 'feed'
  properties: Record<string, unknown>
}

export function projectRecording(r: Recording, binding: MappingBinding): Projection {
  const sourceId = isBundled(binding) ? r.id : `${r.id}#${bindingFingerprint(binding)}`
  return {
    type: binding.typeId,
    source: SOURCE,
    source_id: sourceId,
    tier: 'feed',
    properties: buildProperties(binding.fieldMap, (ref) => readRecordingField(r, ref))
  }
}

export function projectSession(s: SessionGroup, binding: MappingBinding): Projection {
  // Session source identifiers already encode the gap threshold
  // (`${first.id}-${threshold}`); the binding fingerprint is appended
  // only for non-bundled bindings so changing the binding trash-and-
  // re-mints sessions the same way changing the threshold does.
  const sourceId = isBundled(binding) ? s.sourceId : `${s.sourceId}#${bindingFingerprint(binding)}`
  return {
    type: binding.typeId,
    source: SOURCE,
    source_id: sourceId,
    tier: 'feed',
    properties: buildProperties(binding.fieldMap, (ref) => readSessionField(s, ref))
  }
}

function buildProperties(
  fieldMap: Record<string, SourceFieldRef>,
  read: (ref: SourceFieldRef) => unknown
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [target, ref] of Object.entries(fieldMap)) {
    const value = read(ref)
    if (value === undefined) continue
    if (typeof value === 'string' && value.length === 0) continue
    out[target] = value
  }
  return out
}

function readRecordingField(r: Recording, ref: SourceFieldRef): unknown {
  if (ref.kind === 'literal') return ref.value
  switch (ref.field) {
    case 'recording.id':
      return r.id
    case 'recording.datetime':
      return r.datetime
    case 'recording.transcript':
      return r.result
    case 'recording.rawTranscript':
      return r.rawResult
    case 'recording.excerpt':
      return r.excerpt
    case 'recording.mode':
      return r.modeName
    case 'recording.model':
      return r.modelName
    case 'recording.device':
      return r.recordingDevice
    case 'recording.appVersion':
      return r.appVersion
    case 'recording.language':
      return r.languageSelected || undefined
    case 'recording.durationSeconds':
      return r.duration / 1000
    case 'recording.segments':
      return r.segments.map((s) => ({ start: s.start, end: s.end, text: s.text }))
    case 'recording.wordCount':
      return r.wordCount
    case 'recording.wordsPerMinute':
      return r.wordsPerMinute
    default:
      // Session-kind ref on a recording — return undefined so the entry
      // gets dropped rather than emitting nonsense. Shouldn't happen
      // through legitimate UI but the type system can't enforce kind-
      // matching here.
      return undefined
  }
}

function readSessionField(s: SessionGroup, ref: SourceFieldRef): unknown {
  if (ref.kind === 'literal') return ref.value
  switch (ref.field) {
    case 'session.sourceId':
      return s.sourceId
    case 'session.startedAt':
      return s.startedAt
    case 'session.endedAt':
      return s.endedAt
    case 'session.recordingCount':
      return s.recordingCount
    case 'session.totalDurationSeconds':
      return s.totalDurationSeconds
    case 'session.dominantMode':
      return s.dominantMode
    case 'session.gapThresholdMinutes':
      return s.gapThresholdMinutes
    default:
      return undefined
  }
}

/**
 * SHA-256 hash of the projection. Stable across runs given the same
 * input, because we walk keys in sorted order. Used as the change
 * detector in the sync state file — a re-push that produces the same
 * projection is a no-op.
 */
export function hashProjection(projection: unknown): string {
  const canonical = canonicalJsonStringify(projection)
  return createHash('sha256').update(canonical).digest('hex')
}

function canonicalJsonStringify(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJsonStringify).join(',') + ']'
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as object).sort()
    return (
      '{' +
      keys
        .map((k) => {
          const v = (value as Record<string, unknown>)[k]
          if (v === undefined) return null
          return JSON.stringify(k) + ':' + canonicalJsonStringify(v)
        })
        .filter((s) => s !== null)
        .join(',') +
      '}'
    )
  }
  // undefined, function, symbol — drop.
  return 'null'
}
