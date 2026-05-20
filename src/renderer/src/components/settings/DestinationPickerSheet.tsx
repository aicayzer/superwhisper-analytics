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
import { PickTile } from './parts/PickTile'

interface DestinationPickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: SourceKind
  binding: MappingBinding
  onPick: (next: MappingBinding) => void
}

/**
 * Sheet for picking the destination Myme type.
 *
 *   • Default — the bundled `superwhisper.recording` / `.session` type.
 *     Single tile. Sensible starting point; what most users use.
 *   • Your custom types — pulled from the user's tenant via
 *     `listServerTypes`. Search input above the grid; tiles for each
 *     custom type. Hidden when the user has no custom types.
 *
 * Picking commits + closes. Plain sans-serif throughout — no mono on
 * the type IDs. Monochrome selection (dark grey border + faint tint).
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

  const showCustomGroup = tenantTypes.length > 0 || typeListLoading

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
        <DialogBody className="space-y-5">
          <section className="space-y-2">
            <SectionLabel>Default</SectionLabel>
            <PickTile
              picked={binding.mode === 'bundled' && binding.typeId === defaultTypeId}
              label={defaultTypeId}
              subtitle="Ships with the app."
              onClick={pickDefault}
            />
          </section>

          {showCustomGroup && (
            <section className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <SectionLabel>Your custom types</SectionLabel>
                <span className="text-[11px] text-muted-foreground">
                  {typeListLoading ? 'Loading…' : `${tenantTypes.length} available`}
                </span>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your types…"
                className="h-7 w-full rounded-md border border-border bg-card px-2.5 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40"
              />
              {filtered.length === 0 ? (
                <p className="px-1 py-2 text-[12px] text-muted-foreground">
                  {query ? `No types match "${query}".` : 'No types in your tenant yet.'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map((t) => (
                    <PickTile
                      key={t.id}
                      picked={binding.mode === 'existing' && binding.typeId === t.id}
                      label={t.label || t.id}
                      subtitle={
                        t.label
                          ? `${t.id} · ${t.fields.length} field${t.fields.length === 1 ? '' : 's'}`
                          : `${t.fields.length} field${t.fields.length === 1 ? '' : 's'}`
                      }
                      onClick={() => pickTenant(t)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h3 className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  )
}
