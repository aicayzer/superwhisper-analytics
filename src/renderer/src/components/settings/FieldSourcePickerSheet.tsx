import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { useMemo } from 'react'
import { listRecordingSourceLabels, listSessionSourceLabels } from '@shared/myme-labels'
import type {
  MappingBinding,
  RecordingSourceField,
  SessionSourceField,
  SourceKind
} from '../../../../preload/api'
import { CHROME_BUTTON_WARN } from './parts/chromeButton'
import { PickTile } from './parts/PickTile'

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
 * Sheet for picking the source ref for a target field. Each source is
 * rendered as a compact tile in a two-column grid: plain-English label
 * + the canonical ref underneath as small muted text. No preview value,
 * no type tag, no radio icon — selection is conveyed by the tile's
 * border + background.
 *
 * "Remove this field" lives in the footer on the right (the action),
 * with a small muted caption on the left explaining what it does. Reads
 * left-to-right: what happens → button.
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
  const sourceOptions = useMemo(
    () => (kind === 'recording' ? listRecordingSourceLabels() : listSessionSourceLabels()),
    [kind]
  )

  const currentRef = targetField ? binding.fieldMap[targetField] : undefined
  const currentField = currentRef?.kind === 'source' ? currentRef.field : null

  function pick(field: string): void {
    if (!targetField) return
    // The source list is hand-mirrored from the canonical
    // `RecordingSourceField` / `SessionSourceField` union, so the cast
    // at the boundary is safe by construction.
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
              <span className="text-[13px] text-foreground">{targetField}</span>
            </span>
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            Where this field&rsquo;s value comes from on each recording.
          </p>
        </DialogHeader>
        <DialogBody>
          <div className="grid grid-cols-2 gap-2">
            {sourceOptions.map(({ field, label }) => (
              <PickTile
                key={field}
                picked={field === currentField}
                label={label.label}
                subtitle={field}
                onClick={() => pick(field)}
              />
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <span className="text-[11.5px] text-muted-foreground">
            Drops it from the mapping on the next sync.
          </span>
          <button type="button" onClick={onRemove} className={CHROME_BUTTON_WARN}>
            Remove this field
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
