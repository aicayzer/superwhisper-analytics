import type { TypeSchema } from '@mymehq/sdk'

/**
 * Myme custom-type schemas registered by this integration.
 *
 * Two types, both under the `superwhisper.*` publisher namespace:
 * `superwhisper.recording` (inherits from `core.note`) and
 * `superwhisper.session` (standalone, analytics-app-only).
 *
 * The schemas live here so both the one-off registration script
 * (`scripts/myme-register-types.ts`) and the projection layer
 * (`projection.ts`) share a single source of truth for field names.
 *
 * Caveats noted in the running-log artifact:
 *
 * - `core.file.audio` has a required `blob_ref`, so v1 cannot push the
 *   audio file as a separate item without uploading the bytes. The
 *   transcript on `superwhisper.recording.body` is the load-bearing
 *   data — audio is deferred.
 * - The spec's field-shape examples (`{ type: 'array', items: { type:
 *   'object' } }`) don't compile against the SDK's `FieldDefinition`
 *   (which uses `items_type: string`). The schemas below use the SDK
 *   shape.
 * - The spec's `superwhisper.session` declares `merge_policy.fields.title`
 *   but doesn't list `title` in `fields`; `MergePolicy` requires every
 *   field-keyed entry to exist in `fields`, so `title` is added below.
 */

export const SOURCE = 'superwhisper-analytics'

export const SUPERWHISPER_RECORDING: TypeSchema = {
  id: 'superwhisper.recording',
  parent: 'core.note',
  label: 'Superwhisper recording',
  description: 'A voice recording captured by Superwhisper, with transcript and metadata.',
  version: 1,
  fields: {
    // body / title / language inherited from core.note
    segments: {
      type: 'array',
      items_type: 'object',
      description: 'Word-timestamped transcript segments.'
    },
    raw_result: {
      type: 'string',
      description: 'Raw, unprocessed transcript (Superwhisper rawResult).'
    },
    duration_seconds: { type: 'number', description: 'Recording length in seconds.' },
    model: { type: 'string', description: 'Transcription model used.' },
    mode: { type: 'string', description: 'Superwhisper mode (dictation, command, etc.).' },
    device: { type: 'string', description: 'Recording device label.' },
    app_version: {
      type: 'string',
      description: 'Superwhisper app version that captured the recording.'
    },
    datetime: { type: 'datetime', description: 'Recording start time (not item creation time).' }
  },
  merge_policy: {
    fields: {
      body: 'keep_both_copies'
    },
    default: 'last_writer_wins'
  }
}

export const SUPERWHISPER_SESSION: TypeSchema = {
  id: 'superwhisper.session',
  label: 'Superwhisper session',
  description:
    'A gap-grouped set of recordings, derived locally by the Superwhisper Analytics app.',
  version: 1,
  fields: {
    title: { type: 'string', description: 'Free-text user-naming field. Empty by default.' },
    started_at: { type: 'datetime', description: 'First recording in the session.' },
    ended_at: { type: 'datetime', description: 'End of the last recording in the session.' },
    recording_count: { type: 'number', description: 'Number of recordings in this session.' },
    total_duration_seconds: { type: 'number', description: 'Sum of recording durations.' },
    dominant_mode: { type: 'string', description: 'Most-used Superwhisper mode in the session.' },
    gap_threshold_minutes: {
      type: 'number',
      description: 'Threshold (minutes) that defined session boundaries when this was minted.'
    }
  },
  merge_policy: {
    fields: {
      title: 'keep_both_copies'
    },
    default: 'last_writer_wins'
  }
}

export const ALL_SCHEMAS: TypeSchema[] = [SUPERWHISPER_RECORDING, SUPERWHISPER_SESSION]
