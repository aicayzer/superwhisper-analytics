import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { useMymeStore } from '@renderer/state/mymeStore'
import { useEffect, useMemo, useState } from 'react'
import type { MappingBinding, SourceKind, TypeSummary } from '../../../../preload/api'
import { Group } from './parts/Group'
import { PickRow } from './parts/PickRow'

interface DestinationPickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: SourceKind
  binding: MappingBinding
  onPick: (next: MappingBinding) => void
}

/**
 * Sheet for picking the destination Myme type. Three groups:
 *
 *   • Default — the bundled `superwhisper.recording` / `.session` type.
 *     Single radio. Sensible starting point; what 95% of users use.
 *   • Your custom types — pulled from the user's tenant via the
 *     `listServerTypes` endpoint. Hidden when there are none.
 *
 * Picking commits + closes. The "Create a new type" affordance lives in
 * the existing TypeMappingCard's authored flow; we don't ship that in
 * v1 of the redesign (cited as future scope in the plan).
 */
export function DestinationPickerSheet({
  open,
  onOpenChange,
  kind,
  binding,
  onPick
}: DestinationPickerSheetProps): React.JSX.Element {
  const typeList = useMymeStore((s) => s.typeList)
  const typeListLoading = useMymeStore((s) => s.typeListLoading)
  const refreshTypeList = useMymeStore((s) => s.refreshTypeList)
  const [query, setQuery] = useState('')

  // Refresh the type list when the sheet opens so the user sees the
  // latest tenant state. Idempotent — the store no-ops if already loading.
  useEffect(() => {
    if (open) void refreshTypeList()
  }, [open, refreshTypeList])

  const defaultTypeId = kind === 'recording' ? 'superwhisper.recording' : 'superwhisper.session'

  const tenantTypes = useMemo<TypeSummary[]>(() => {
    if (!typeList) return []
    // Filter out the bundled types — those land under "Default".
    return typeList.filter(
      (t) => t.id !== 'superwhisper.recording' && t.id !== 'superwhisper.session'
    )
  }, [typeList])

  const filtered = useMemo(() => {
    if (!query.trim()) return tenantTypes
    const q = query.toLowerCase()
    return tenantTypes.filter(
      (t) => t.id.toLowerCase().includes(q) || (t.label?.toLowerCase().includes(q) ?? false)
    )
  }, [tenantTypes, query])

  function pickDefault(): void {
    onPick({ ...binding, mode: 'bundled', typeId: defaultTypeId })
  }

  function pickTenant(type: TypeSummary): void {
    onPick({ ...binding, mode: 'existing', typeId: type.id })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pick a destination</DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            Where in Myme this pipeline writes. Default works for everyone — pick a custom type only
            if you&rsquo;ve authored one in your tenant.
          </p>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Group label="Default">
            <PickRow
              picked={binding.mode === 'bundled' && binding.typeId === defaultTypeId}
              first
              onClick={pickDefault}
              title={
                <code className="font-mono text-[12.5px] font-medium text-foreground">
                  {defaultTypeId}
                </code>
              }
              subtitle="Ships with the app."
            />
          </Group>

          {(tenantTypes.length > 0 || typeListLoading) && (
            <Group
              label="Your custom types"
              hint={typeListLoading ? 'Loading…' : `${tenantTypes.length} available`}
            >
              <div className="border-b border-border px-3 py-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your types…"
                  className="h-7 w-full bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-[12px] text-muted-foreground">
                  {query ? `No types match "${query}".` : 'No types in your tenant yet.'}
                </div>
              ) : (
                filtered.map((t, i) => (
                  <PickRow
                    key={t.id}
                    picked={binding.mode === 'existing' && binding.typeId === t.id}
                    first={i === 0}
                    onClick={() => pickTenant(t)}
                    title={
                      <code className="font-mono text-[12.5px] font-medium text-foreground">
                        {t.id}
                      </code>
                    }
                    subtitle={
                      t.label
                        ? `${t.label} · ${t.fields.length} field${t.fields.length === 1 ? '' : 's'}`
                        : `${t.fields.length} field${t.fields.length === 1 ? '' : 's'}`
                    }
                  />
                ))
              )}
            </Group>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
