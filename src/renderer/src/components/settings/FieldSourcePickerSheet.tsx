import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { useDataStore } from '@renderer/state/dataStore'
import { useMemo } from 'react'
import { listRecordingSourceLabels, listSessionSourceLabels } from '@shared/myme-labels'
import type {
  MappingBinding,
  RecordingSourceField,
  SessionSourceField,
  SourceKind
} from '../../../../preload/api'
import { CHROME_BUTTON_WARN } from './parts/chromeButton'
import { Group } from './parts/Group'
import { PickRow } from './parts/PickRow'

interface FieldSourcePickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: SourceKind
  /** `null` when the sheet is closed. */
  targetField: string | null
  binding: MappingBinding
  onChange: (next: MappingBinding) => void
  onRemove: () => void
}

/**
 * Sheet for picking the source ref for a target field. Three lines per
 * option: plain-English label (primary), canonical ref (dimmed mono,
 * secondary), and a sample value from the head recording (italic,
 * tertiary). The user reads English, the power user reads the ref,
 * everyone sees what the value looks like in practice.
 *
 * "Remove this field" lives in the footer — destructive, accent-orange
 * tinted, removes + closes in one click.
 */
export function FieldSourcePickerSheet({
  open,
  onOpenChange,
  kind,
  targetField,
  binding,
  onChange,
  onRemove
}: FieldSourcePickerSheetProps): React.JSX.Element {
  const headRecording = useDataStore((s) => s.recordings[0])

  const sourceOptions = useMemo(
    () => (kind === 'recording' ? listRecordingSourceLabels() : listSessionSourceLabels()),
    [kind]
  )

  const currentRef = targetField ? binding.fieldMap[targetField] : undefined
  const currentField = currentRef?.kind === 'source' ? currentRef.field : null

  function pick(field: string): void {
    if (!targetField) return
    // Cast: the source list is hand-mirrored from the canonical
    // `RecordingSourceField` / `SessionSourceField` union. Picker
    // options are only ever the keys of `@shared/myme-labels`, so the
    // narrowing is safe by construction. Keeping the function signature
    // in `string` here keeps the renderer free of the union import
    // dance.
    onChange({
      ...binding,
      fieldMap: {
        ...binding.fieldMap,
        [targetField]: {
          kind: 'source',
          field: field as RecordingSourceField | SessionSourceField
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-baseline gap-2">
              <span className="text-muted-foreground">Source for</span>
              <code className="font-mono text-[13px] text-foreground">{targetField}</code>
            </span>
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            Where this field&rsquo;s value comes from on each recording.
          </p>
        </DialogHeader>
        <DialogBody>
          <Group label="Source">
            {sourceOptions.map(({ field, label }, i) => (
              <PickRow
                key={field}
                picked={field === currentField}
                first={i === 0}
                onClick={() => pick(field)}
                title={
                  <span className="inline-flex items-baseline gap-2">
                    <span>{label.label}</span>
                    <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground/70">
                      {label.type}
                    </span>
                  </span>
                }
                subtitle={
                  <code className="font-mono text-[11px] text-muted-foreground/80">{field}</code>
                }
                preview={kind === 'recording' ? previewFor(field, headRecording) : undefined}
              />
            ))}
          </Group>
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={onRemove} className={CHROME_BUTTON_WARN}>
            Remove this field
          </button>
          <span className="text-[11.5px] text-muted-foreground">
            Drops it from the mapping on the next sync.
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Best-effort preview value from the head recording. Truncated.
 *  Returns undefined when nothing useful can be shown — `PickRow`
 *  hides the row when preview is undefined.
 *  `field` is loosely typed as `string` so the renderer doesn't have
 *  to import the canonical union; the switch handles the recording-side
 *  cases and falls back to `undefined` for anything else (sessions, or
 *  a hand-rolled custom ref). */
function previewFor(
  field: string,
  head: ReturnType<typeof useDataStore.getState>['recordings'][number] | undefined
): string | undefined {
  if (!head) return undefined
  const v = ((): unknown => {
    switch (field) {
      case 'recording.transcript':
        return head.result
      case 'recording.rawTranscript':
        return head.rawResult
      case 'recording.excerpt':
        return head.excerpt
      case 'recording.datetime':
        return head.datetime
      case 'recording.mode':
        return head.modeName
      case 'recording.model':
        return head.modelName
      case 'recording.input_device':
        return head.recordingDevice
      case 'recording.appVersion':
        return head.appVersion
      case 'recording.language':
        return head.languageSelected
      case 'recording.durationSeconds':
        return head.duration ? (head.duration / 1000).toFixed(1) + 's' : undefined
      case 'recording.wordCount':
        return head.wordCount
      case 'recording.wordsPerMinute':
        return head.wordsPerMinute
      default:
        return undefined
    }
  })()
  if (v == null || v === '') return undefined
  const s = String(v)
  return s.length > 80 ? s.slice(0, 77) + '…' : s
}
