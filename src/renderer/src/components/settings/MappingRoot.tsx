import { cn } from '@renderer/lib/cn'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { getSourceFieldLabel } from '@shared/myme-labels'
import type { MappingBinding, SourceKind } from '../../../../preload/api'
import { DestinationPickerSheet } from './DestinationPickerSheet'
import { FieldSourcePickerSheet } from './FieldSourcePickerSheet'
import { Group } from './parts/Group'

interface MappingRootProps {
  kind: SourceKind
  binding: MappingBinding
  onChange: (next: MappingBinding) => void
}

/**
 * Inline mapping editor inside the PipelineCard body. Two groups:
 *   • Goes to — destination row showing the bound type and field count.
 *   • Fields — one row per mapped field, click opens the field-source
 *     picker.
 *
 * Both groups use plain sans-serif throughout — no mono. The type id
 * and field names are identifiers but display as regular text so the
 * card doesn't read like a config file.
 *
 * Removal lives inside the field-source picker (footer right) rather
 * than as a per-row × on the field list.
 */
export function MappingRoot({ kind, binding, onChange }: MappingRootProps): React.JSX.Element {
  const [destOpen, setDestOpen] = useState(false)
  const [fieldKey, setFieldKey] = useState<string | null>(null)

  const fieldEntries = Object.entries(binding.fieldMap)

  return (
    <div className="space-y-4">
      <Group label="Goes to">
        <button
          type="button"
          onClick={() => setDestOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.04]"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-foreground">
              {binding.typeId}
            </span>
            <span className="mt-0.5 block text-[12px] text-muted-foreground">
              {describeMode(binding)} · {fieldEntries.length} field
              {fieldEntries.length === 1 ? '' : 's'}
            </span>
          </span>
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
            strokeWidth={1.7}
          />
        </button>
      </Group>

      {fieldEntries.length > 0 && (
        <Group label="Fields">
          {fieldEntries.map(([targetField, ref], i) => (
            <FieldRow
              key={targetField}
              targetField={targetField}
              sourceRef={ref}
              first={i === 0}
              onOpen={() => setFieldKey(targetField)}
            />
          ))}
        </Group>
      )}

      <DestinationPickerSheet
        open={destOpen}
        onOpenChange={setDestOpen}
        kind={kind}
        binding={binding}
        onPick={(next) => {
          onChange(next)
          setDestOpen(false)
        }}
      />

      <FieldSourcePickerSheet
        open={fieldKey !== null}
        onOpenChange={(open) => {
          if (!open) setFieldKey(null)
        }}
        kind={kind}
        targetField={fieldKey}
        binding={binding}
        onChange={onChange}
        onRemove={() => {
          if (fieldKey) onChange(removeField(binding, fieldKey))
          setFieldKey(null)
        }}
      />
    </div>
  )
}

function describeMode(binding: MappingBinding): string {
  switch (binding.mode) {
    case 'bundled':
      return 'Default'
    case 'existing':
      return 'Your custom type'
    case 'authored':
      return 'New type'
  }
}

function removeField(binding: MappingBinding, key: string): MappingBinding {
  const next: Record<string, MappingBinding['fieldMap'][string]> = {}
  for (const [k, v] of Object.entries(binding.fieldMap)) {
    if (k !== key) next[k] = v
  }
  return { ...binding, fieldMap: next }
}

interface FieldRowProps {
  targetField: string
  sourceRef: MappingBinding['fieldMap'][string]
  first: boolean
  onOpen: () => void
}

function FieldRow({ targetField, sourceRef, first, onOpen }: FieldRowProps): React.JSX.Element {
  // Plain-English source label so the row reads at a glance — the ref
  // itself (recording.transcript etc.) lives inside the picker.
  const sourceLabel =
    sourceRef.kind === 'source' ? getSourceFieldLabel(sourceRef.field).label : 'Fixed value'
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-foreground/[0.04]',
        !first && 'border-t border-border'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-foreground">
          {targetField}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
          {sourceLabel}
        </span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" strokeWidth={1.7} />
    </button>
  )
}
