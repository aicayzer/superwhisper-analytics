import { createHash } from 'crypto'
import type { TypeSchema } from '@mymehq/sdk'
import { SUPERWHISPER_RECORDING, SUPERWHISPER_SESSION } from './schemas'

/**
 * Mapping config — what local Superwhisper data maps to in Myme.
 *
 * Two source kinds (recording, session); each binds to a target type
 * (bundled / existing / authored) and a field map. The field map is the
 * contract between the local source object and the wire payload:
 * `{ [targetField]: SourceFieldRef }`.
 *
 * Default = bundled, identity field map. Older configs without a mapping
 * block migrate transparently in `config.ts`.
 *
 * Trash-and-re-mint: each non-bundled mapping has a fingerprint that
 * gets folded into the item's `source_id`. Changing the binding or the
 * field map produces fresh source_ids; old items diff out and
 * soft-delete on the next sync. Bundled uses no suffix so existing
 * source_ids stay stable for users mid-migration.
 */

export type MappingMode = 'bundled' | 'existing' | 'authored'

/**
 * Reference to a field on the local source object. Finite set of kinds
 * keeps the picker UI bounded and the projection layer unambiguous.
 *
 * `recording.durationSeconds` converts the on-disk millisecond duration
 * to seconds, matching the bundled `superwhisper.recording.duration_seconds`
 * field. `recording.transcript` is the cleaned `result`;
 * `recording.rawTranscript` is `rawResult`.
 */
export type RecordingSourceField =
  | 'recording.id'
  | 'recording.datetime'
  | 'recording.transcript'
  | 'recording.rawTranscript'
  | 'recording.excerpt'
  | 'recording.mode'
  | 'recording.model'
  | 'recording.input_device'
  | 'recording.appVersion'
  | 'recording.language'
  | 'recording.durationSeconds'
  | 'recording.segments'
  | 'recording.wordCount'
  | 'recording.wordsPerMinute'

export type SessionSourceField =
  | 'session.sourceId'
  | 'session.startedAt'
  | 'session.endedAt'
  | 'session.recordingCount'
  | 'session.totalDurationSeconds'
  | 'session.dominantMode'
  | 'session.gapThresholdMinutes'

export type SourceFieldRef =
  | { kind: 'source'; field: RecordingSourceField | SessionSourceField }
  | { kind: 'literal'; value: string | number | boolean }

export type FieldMap = Record<string, SourceFieldRef>

export interface MappingBinding {
  mode: MappingMode
  /** Type id of the target. For bundled this is
   *  `superwhisper.recording` / `superwhisper.session`; for existing it's
   *  whichever type the user picked; for authored it's the id baked into
   *  `authoredSchema`. */
  typeId: string
  /** Field map keyed by target field name. */
  fieldMap: FieldMap
  /** When `mode === 'authored'`, the schema the app will register on
   *  next sync. Carried in config so registration is idempotent and
   *  survives restart. */
  authoredSchema?: TypeSchema
}

export interface MymeMapping {
  recording: MappingBinding
  session: MappingBinding
}

/** Source kind a binding describes. */
export type SourceKind = 'recording' | 'session'

// ---------------------------------------------------------------------------
// Bundled defaults
// ---------------------------------------------------------------------------

const BUNDLED_RECORDING_FIELD_MAP: FieldMap = {
  body: { kind: 'source', field: 'recording.transcript' },
  raw_result: { kind: 'source', field: 'recording.rawTranscript' },
  segments: { kind: 'source', field: 'recording.segments' },
  duration_seconds: { kind: 'source', field: 'recording.durationSeconds' },
  model: { kind: 'source', field: 'recording.model' },
  mode: { kind: 'source', field: 'recording.mode' },
  input_device: { kind: 'source', field: 'recording.input_device' },
  app_version: { kind: 'source', field: 'recording.appVersion' },
  datetime: { kind: 'source', field: 'recording.datetime' },
  language: { kind: 'source', field: 'recording.language' }
}

const BUNDLED_SESSION_FIELD_MAP: FieldMap = {
  title: { kind: 'literal', value: '' },
  started_at: { kind: 'source', field: 'session.startedAt' },
  ended_at: { kind: 'source', field: 'session.endedAt' },
  recording_count: { kind: 'source', field: 'session.recordingCount' },
  total_duration_seconds: { kind: 'source', field: 'session.totalDurationSeconds' },
  dominant_mode: { kind: 'source', field: 'session.dominantMode' },
  gap_threshold_minutes: { kind: 'source', field: 'session.gapThresholdMinutes' }
}

export function defaultBundledRecordingBinding(): MappingBinding {
  return {
    mode: 'bundled',
    typeId: SUPERWHISPER_RECORDING.id,
    fieldMap: { ...BUNDLED_RECORDING_FIELD_MAP }
  }
}

export function defaultBundledSessionBinding(): MappingBinding {
  return {
    mode: 'bundled',
    typeId: SUPERWHISPER_SESSION.id,
    fieldMap: { ...BUNDLED_SESSION_FIELD_MAP }
  }
}

export function defaultMapping(): MymeMapping {
  return {
    recording: defaultBundledRecordingBinding(),
    session: defaultBundledSessionBinding()
  }
}

// ---------------------------------------------------------------------------
// Fingerprinting
// ---------------------------------------------------------------------------

const BUNDLED_FINGERPRINT = 'b'
const FINGERPRINT_LENGTH = 8

/**
 * Stable short fingerprint of a binding. Bundled is the sentinel string
 * `'b'` (so source_ids stay stable for users on the default mapping);
 * any other mapping gets an 8-char SHA-256 prefix of
 * `{ typeId, fieldMap }`. Changing either invalidates source_ids and
 * drives trash-and-re-mint on next sync.
 */
export function bindingFingerprint(binding: MappingBinding): string {
  if (binding.mode === 'bundled') return BUNDLED_FINGERPRINT
  const canonical = canonicalize({ typeId: binding.typeId, fieldMap: binding.fieldMap })
  return createHash('sha256').update(canonical).digest('hex').slice(0, FINGERPRINT_LENGTH)
}

/** True when the binding uses the bundled fingerprint (no suffix on source_ids). */
export function isBundled(binding: MappingBinding): boolean {
  return binding.mode === 'bundled'
}

// ---------------------------------------------------------------------------
// Default field-map generation for a target type
// ---------------------------------------------------------------------------

/**
 * Case-insensitive alias table mapping target field names to recording
 * source fields. Used by `defaultRecordingFieldMap` to auto-pair fields
 * when the user picks a non-bundled type.
 */
const RECORDING_FIELD_ALIASES: Record<string, RecordingSourceField> = {
  body: 'recording.transcript',
  text: 'recording.transcript',
  content: 'recording.transcript',
  transcript: 'recording.transcript',
  raw: 'recording.rawTranscript',
  raw_result: 'recording.rawTranscript',
  raw_transcript: 'recording.rawTranscript',
  title: 'recording.excerpt',
  name: 'recording.excerpt',
  excerpt: 'recording.excerpt',
  datetime: 'recording.datetime',
  recorded_at: 'recording.datetime',
  created_at: 'recording.datetime',
  date: 'recording.datetime',
  duration: 'recording.durationSeconds',
  duration_seconds: 'recording.durationSeconds',
  duration_sec: 'recording.durationSeconds',
  mode: 'recording.mode',
  model: 'recording.model',
  device: 'recording.input_device',
  app_version: 'recording.appVersion',
  version: 'recording.appVersion',
  language: 'recording.language',
  lang: 'recording.language',
  segments: 'recording.segments',
  word_count: 'recording.wordCount',
  words: 'recording.wordCount',
  wpm: 'recording.wordsPerMinute',
  words_per_minute: 'recording.wordsPerMinute'
}

const SESSION_FIELD_ALIASES: Record<string, SessionSourceField> = {
  title: 'session.sourceId',
  name: 'session.sourceId',
  source_id: 'session.sourceId',
  started_at: 'session.startedAt',
  start: 'session.startedAt',
  ended_at: 'session.endedAt',
  end: 'session.endedAt',
  recording_count: 'session.recordingCount',
  count: 'session.recordingCount',
  duration_seconds: 'session.totalDurationSeconds',
  total_duration_seconds: 'session.totalDurationSeconds',
  mode: 'session.dominantMode',
  dominant_mode: 'session.dominantMode',
  gap_threshold_minutes: 'session.gapThresholdMinutes'
}

/**
 * Build a sensible default field map for a target type given its
 * schema. Iterates declared fields, pairing each to a source ref by
 * name alias. Unmapped fields are left out — the projection emits only
 * fields that have a ref. Inherited fields (e.g. `core.note.body`) are
 * not visible on the child schema's `fields`; the bundled mapping
 * defines those manually.
 */
export function defaultRecordingFieldMap(target: TypeSchema): FieldMap {
  // For the bundled type, return the canonical layout (which includes
  // inherited core.note fields not listed on the type itself).
  if (target.id === SUPERWHISPER_RECORDING.id) {
    return { ...BUNDLED_RECORDING_FIELD_MAP }
  }
  const out: FieldMap = {}
  for (const fieldName of Object.keys(target.fields ?? {})) {
    const ref = aliasFor(fieldName, RECORDING_FIELD_ALIASES)
    if (ref) out[fieldName] = { kind: 'source', field: ref }
  }
  // If the target inherits from core.note, also wire body to transcript
  // and title to excerpt — they're inherited fields, not on
  // `target.fields`, but they're the natural landing pads for a
  // recording's text content. The user can drop them in the override
  // UI if they don't want them.
  if (target.parent === 'core.note') {
    if (!out.body) out.body = { kind: 'source', field: 'recording.transcript' }
    if (!out.title) out.title = { kind: 'source', field: 'recording.excerpt' }
    if (!out.language) out.language = { kind: 'source', field: 'recording.language' }
  }
  return out
}

export function defaultSessionFieldMap(target: TypeSchema): FieldMap {
  if (target.id === SUPERWHISPER_SESSION.id) {
    return { ...BUNDLED_SESSION_FIELD_MAP }
  }
  const out: FieldMap = {}
  for (const fieldName of Object.keys(target.fields ?? {})) {
    const ref = aliasFor(fieldName, SESSION_FIELD_ALIASES)
    if (ref) out[fieldName] = { kind: 'source', field: ref }
  }
  return out
}

function aliasFor<T extends string>(name: string, table: Record<string, T>): T | null {
  return table[name.toLowerCase()] ?? null
}

// ---------------------------------------------------------------------------
// Authored-type starter schema
// ---------------------------------------------------------------------------

/**
 * Build a starter `TypeSchema` for the inline "author a new type"
 * flow. The user supplies a type id (e.g. `eval.recording`); we
 * pre-populate a sensible field set covering the Superwhisper
 * recording surface so the resulting type captures the same data the
 * bundled type does, just under a user-owned id.
 *
 * The user can tweak the field set in the form; this just defines the
 * happy-path defaults.
 */
export function authoredRecordingStarter(typeId: string, label?: string): TypeSchema {
  return {
    id: typeId,
    parent: 'core.note',
    label: label || typeId,
    description: 'User-authored mapping for Superwhisper recordings.',
    version: 1,
    fields: {
      raw_result: { type: 'string', description: 'Raw transcript text.' },
      duration_seconds: { type: 'number', description: 'Recording length in seconds.' },
      model: { type: 'string', description: 'Transcription model used.' },
      mode: { type: 'string', description: 'Superwhisper mode.' },
      device: { type: 'string', description: 'Recording device label.' },
      datetime: { type: 'datetime', description: 'Recording start time.' }
    }
  }
}

export function authoredSessionStarter(typeId: string, label?: string): TypeSchema {
  return {
    id: typeId,
    label: label || typeId,
    description: 'User-authored mapping for Superwhisper sessions.',
    version: 1,
    fields: {
      title: { type: 'string', description: 'Free-text user-naming field.' },
      started_at: { type: 'datetime', description: 'First recording in the session.' },
      ended_at: { type: 'datetime', description: 'Last recording in the session.' },
      recording_count: { type: 'number', description: 'Number of recordings.' },
      total_duration_seconds: { type: 'number', description: 'Sum of durations.' },
      dominant_mode: { type: 'string', description: 'Most-used mode.' }
    }
  }
}

// ---------------------------------------------------------------------------
// Canonical stringify (re-implemented here to keep mapping.ts free of
// circular deps with projection.ts)
// ---------------------------------------------------------------------------

function canonicalize(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']'
  if (typeof value === 'object') {
    const keys = Object.keys(value as object).sort()
    return (
      '{' +
      keys
        .map((k) => {
          const v = (value as Record<string, unknown>)[k]
          if (v === undefined) return null
          return JSON.stringify(k) + ':' + canonicalize(v)
        })
        .filter((s) => s !== null)
        .join(',') +
      '}'
    )
  }
  return 'null'
}
