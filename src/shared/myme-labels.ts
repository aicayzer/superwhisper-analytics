/**
 * Plain-English labels for Myme source-field refs. Shared between
 * main and renderer — main uses them when projecting (today: not yet,
 * but it can grow into hover-tooltip context); renderer uses them in
 * the Sync tab's field-source picker so the user reads "Transcript
 * text" instead of `recording.transcript`.
 *
 * Pure data. No imports from electron / SDKs / main-only modules so
 * the renderer can pull from it without dragging the main bundle into
 * its build graph.
 *
 * The string literals here are intentionally duplicated from
 * `RecordingSourceField` / `SessionSourceField` in `main/myme/mapping`
 * — keeping the canonical type union there lets mapping.ts continue
 * to compile-time-check the field map, while this module stays free
 * of any cross-boundary imports. Drift is caught by the type
 * narrowing in `getSourceFieldLabel` callers.
 */

export interface SourceFieldLabel {
  /** Plain-English title. */
  label: string
  /** Wire type tag — "string" / "number" / "datetime" / "array". */
  type: 'string' | 'number' | 'datetime' | 'array'
}

const RECORDING_LABELS: Record<string, SourceFieldLabel> = {
  'recording.id': { label: 'Recording id', type: 'string' },
  'recording.datetime': { label: 'Recording start time', type: 'datetime' },
  'recording.transcript': { label: 'Transcript text', type: 'string' },
  'recording.rawTranscript': { label: 'Raw transcript', type: 'string' },
  'recording.excerpt': { label: 'Excerpt', type: 'string' },
  'recording.mode': { label: 'Mode', type: 'string' },
  'recording.model': { label: 'Model', type: 'string' },
  'recording.input_device': { label: 'Input device', type: 'string' },
  'recording.appVersion': { label: 'SuperWhisper version', type: 'string' },
  'recording.language': { label: 'Language', type: 'string' },
  'recording.durationSeconds': { label: 'Duration (seconds)', type: 'number' },
  'recording.segments': { label: 'Transcript segments', type: 'array' },
  'recording.wordCount': { label: 'Word count', type: 'number' },
  'recording.wordsPerMinute': { label: 'Words per minute', type: 'number' }
}

const SESSION_LABELS: Record<string, SourceFieldLabel> = {
  'session.sourceId': { label: 'Session id', type: 'string' },
  'session.startedAt': { label: 'Session start', type: 'datetime' },
  'session.endedAt': { label: 'Session end', type: 'datetime' },
  'session.recordingCount': { label: 'Recording count', type: 'number' },
  'session.totalDurationSeconds': { label: 'Total duration (seconds)', type: 'number' },
  'session.dominantMode': { label: 'Dominant mode', type: 'string' },
  'session.gapThresholdMinutes': { label: 'Session gap (minutes)', type: 'number' }
}

/** Render-side lookup. Falls back to the raw ref string if the ref
 *  isn't in either dictionary. */
export function getSourceFieldLabel(field: string): SourceFieldLabel {
  return RECORDING_LABELS[field] ?? SESSION_LABELS[field] ?? { label: field, type: 'string' }
}

/** All Recording source fields with labels — for the field-source
 *  picker list. */
export function listRecordingSourceLabels(): Array<{ field: string; label: SourceFieldLabel }> {
  return Object.keys(RECORDING_LABELS).map((field) => ({
    field,
    label: RECORDING_LABELS[field] as SourceFieldLabel
  }))
}

/** All Session source fields with labels — for the field-source picker
 *  list. */
export function listSessionSourceLabels(): Array<{ field: string; label: SourceFieldLabel }> {
  return Object.keys(SESSION_LABELS).map((field) => ({
    field,
    label: SESSION_LABELS[field] as SourceFieldLabel
  }))
}
