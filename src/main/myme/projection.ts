import { createHash } from 'crypto'
import type { Recording } from '@shared/types'
import { SOURCE } from './schemas'

/**
 * Pure mapping from a local `Recording` to the `superwhisper.recording`
 * item payload that gets pushed to Myme.
 *
 * The shape here is the contract between the analytics app and the Myme
 * tenant — every key in `properties` must be a field on the registered
 * schema (`schemas.ts`). Add a field → update both files; the hash
 * function below will surface the change as a forced re-push for every
 * existing recording, which is the right thing.
 *
 * `source_id` is the recording's directory name (a 10-digit unix
 * timestamp). Stable per recording — used as the natural key for
 * upsert. `source` is stamped server-side from the credential, but we
 * include it on the input shape so the projection is self-contained
 * for hashing and tests.
 */

export interface RecordingProjection {
  type: 'superwhisper.recording'
  source: string
  source_id: string
  tier: 'feed'
  properties: {
    body: string
    title?: string
    raw_result: string
    segments: Array<{ start: number; end: number; text: string }>
    duration_seconds: number
    model: string
    mode: string
    device: string
    app_version: string
    datetime: string
    language?: string
  }
}

/**
 * Project a single recording into its Myme item payload. Pure — same
 * input always yields the same output, which is what makes the content
 * hash meaningful.
 */
export function projectRecording(r: Recording): RecordingProjection {
  const projection: RecordingProjection = {
    type: 'superwhisper.recording',
    source: SOURCE,
    source_id: r.id,
    tier: 'feed',
    properties: {
      // The cleaned transcript lands in `body` (inherited from core.note).
      body: r.result,
      raw_result: r.rawResult,
      segments: r.segments.map((s) => ({ start: s.start, end: s.end, text: s.text })),
      duration_seconds: r.duration / 1000,
      model: r.modelName,
      mode: r.modeName,
      device: r.recordingDevice,
      app_version: r.appVersion,
      datetime: r.datetime,
      language: r.languageSelected || undefined
    }
  }
  return projection
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
