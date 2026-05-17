import { useMymeStore } from '@renderer/state/mymeStore'
import { ChevronDown, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type {
  FieldMap,
  MappingBinding,
  MymeMapping,
  SourceFieldRef,
  TypeSummary
} from '../../../../preload/api'

/**
 * Type-mapping panel — renders the binding for each source kind
 * (recording, session) as an always-visible card. No Edit gate;
 * everything the user might change is on screen.
 *
 * Each card carries:
 *   - a segmented [Bundled | Existing | Authored] mode control;
 *   - the current type id;
 *   - the field map (read-only for bundled, editable otherwise);
 *   - inline authoring form when authored;
 *   - Apply / Reset, only when the draft differs from the persisted
 *     binding.
 *
 * Apply runs the trash-and-re-mint confirmation before persisting —
 * fresh source_ids on next sync soft-delete the old items.
 */

const RECORDING_FIELD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'recording.transcript', label: 'transcript (cleaned)' },
  { value: 'recording.rawTranscript', label: 'transcript (raw)' },
  { value: 'recording.excerpt', label: 'excerpt' },
  { value: 'recording.datetime', label: 'datetime' },
  { value: 'recording.durationSeconds', label: 'duration (s)' },
  { value: 'recording.mode', label: 'mode' },
  { value: 'recording.model', label: 'model' },
  { value: 'recording.device', label: 'device' },
  { value: 'recording.appVersion', label: 'app version' },
  { value: 'recording.language', label: 'language' },
  { value: 'recording.segments', label: 'segments' },
  { value: 'recording.wordCount', label: 'word count' },
  { value: 'recording.wordsPerMinute', label: 'words per minute' },
  { value: 'recording.id', label: 'recording id' }
]

const SESSION_FIELD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'session.sourceId', label: 'source id' },
  { value: 'session.startedAt', label: 'started at' },
  { value: 'session.endedAt', label: 'ended at' },
  { value: 'session.recordingCount', label: 'recording count' },
  { value: 'session.totalDurationSeconds', label: 'total duration (s)' },
  { value: 'session.dominantMode', label: 'dominant mode' },
  { value: 'session.gapThresholdMinutes', label: 'gap threshold (min)' }
]

const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  [...RECORDING_FIELD_OPTIONS, ...SESSION_FIELD_OPTIONS].map((o) => [o.value, o.label])
)

const UNMAPPED = '__unmapped__'

interface Props {
  mapping: MymeMapping
  disabled?: boolean
}

export function MappingPanel({ mapping, disabled }: Props): React.JSX.Element {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Type mapping"
        subtitle="Where your recordings and sessions land in Myme."
      />
      <div className="space-y-3">
        <BindingCard
          key={bindingKey(mapping.recording)}
          kind="recording"
          binding={mapping.recording}
          disabled={disabled}
        />
        <BindingCard
          key={bindingKey(mapping.session)}
          kind="session"
          binding={mapping.session}
          disabled={disabled}
        />
      </div>
    </section>
  )
}

function SectionHeader({
  title,
  subtitle
}: {
  title: string
  subtitle: string
}): React.JSX.Element {
  return (
    <div className="space-y-0.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      <p className="text-[12px] text-muted-foreground">{subtitle}</p>
    </div>
  )
}

interface DraftState {
  mode: 'bundled' | 'existing' | 'authored'
  typeId: string
  fieldMap: FieldMap
  authoredLabel: string
}

function BindingCard({
  kind,
  binding,
  disabled
}: {
  kind: 'recording' | 'session'
  binding: MappingBinding
  disabled?: boolean
}): React.JSX.Element {
  const typeList = useMymeStore((s) => s.typeList)
  const typeListLoading = useMymeStore((s) => s.typeListLoading)
  const refreshTypeList = useMymeStore((s) => s.refreshTypeList)
  const setMapping = useMymeStore((s) => s.setMapping)
  const registerType = useMymeStore((s) => s.registerType)
  const currentMapping = useMymeStore((s) => s.mapping)

  const [draft, setDraft] = useState<DraftState>({
    mode: binding.mode,
    typeId: binding.typeId,
    fieldMap: { ...binding.fieldMap },
    authoredLabel: ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  // The parent keys this component on the binding identity, so a fresh
  // mount handles the "binding changed externally" case (disconnect →
  // reconnect, another window pushed a mapping change) without a
  // setState-in-effect dance.

  // Fetch the type list lazily — only when the user reaches for the
  // existing-type picker for the first time.
  useEffect(() => {
    if (draft.mode === 'existing' && typeList === null && !typeListLoading) {
      void refreshTypeList()
    }
  }, [draft.mode, typeList, typeListLoading, refreshTypeList])

  const bundledTypeId = kind === 'recording' ? 'superwhisper.recording' : 'superwhisper.session'
  const bundledFieldMap = useMemo(() => buildBundledFieldMap(kind), [kind])
  const sourceOptions = kind === 'recording' ? RECORDING_FIELD_OPTIONS : SESSION_FIELD_OPTIONS

  function selectMode(mode: DraftState['mode']): void {
    setError(null)
    if (mode === 'bundled') {
      setDraft({
        mode: 'bundled',
        typeId: bundledTypeId,
        fieldMap: { ...bundledFieldMap },
        authoredLabel: ''
      })
      return
    }
    if (mode === 'existing') {
      const first = typeList?.[0]
      setDraft({
        mode: 'existing',
        typeId: first?.id ?? '',
        fieldMap: first ? autoFieldMapFor(kind, first) : {},
        authoredLabel: ''
      })
      return
    }
    setDraft({
      mode: 'authored',
      typeId: kind === 'recording' ? 'eval.recording' : 'eval.session',
      fieldMap: kind === 'recording' ? authoredRecordingDefaults() : authoredSessionDefaults(),
      authoredLabel: ''
    })
  }

  function pickExistingType(id: string): void {
    const type = typeList?.find((t) => t.id === id) ?? null
    setDraft((d) => ({
      ...d,
      typeId: id,
      fieldMap: type ? autoFieldMapFor(kind, type) : {}
    }))
  }

  function setFieldRef(targetField: string, raw: string): void {
    setDraft((d) => {
      const fieldMap = { ...d.fieldMap }
      if (raw === UNMAPPED) delete fieldMap[targetField]
      else fieldMap[targetField] = { kind: 'source', field: raw } as SourceFieldRef
      return { ...d, fieldMap }
    })
  }

  function addTargetField(name: string): void {
    if (!name) return
    setDraft((d) => ({
      ...d,
      fieldMap: {
        ...d.fieldMap,
        [name]: { kind: 'source', field: sourceOptions[0]!.value } as SourceFieldRef
      }
    }))
  }

  function removeTargetField(name: string): void {
    setDraft((d) => {
      const fieldMap = { ...d.fieldMap }
      delete fieldMap[name]
      return { ...d, fieldMap }
    })
  }

  function setTypeId(id: string): void {
    setDraft((d) => ({ ...d, typeId: id }))
  }

  function setAuthoredLabel(label: string): void {
    setDraft((d) => ({ ...d, authoredLabel: label }))
  }

  function reset(): void {
    setDraft({
      mode: binding.mode,
      typeId: binding.typeId,
      fieldMap: { ...binding.fieldMap },
      authoredLabel: ''
    })
    setError(null)
    setConfirming(false)
  }

  function validate(): string | null {
    if (draft.mode === 'authored') {
      if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/i.test(draft.typeId)) {
        return 'Type id must look like `namespace.name` (lowercase letters, digits, dots, underscores).'
      }
      if (Object.keys(draft.fieldMap).length === 0) {
        return 'At least one field is required.'
      }
    }
    if (draft.mode === 'existing' && !draft.typeId) {
      return 'Pick an existing type.'
    }
    return null
  }

  async function applyDraft(): Promise<void> {
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    if (!currentMapping) return
    setBusy(true)
    setError(null)
    try {
      let authoredSchema: MappingBinding['authoredSchema']
      if (draft.mode === 'authored') {
        const schema = buildAuthoredSchema(kind, draft)
        const registered = await registerType(schema)
        if (!registered) {
          setError('Failed to register the new type. Check the type id and try again.')
          setBusy(false)
          return
        }
        authoredSchema = schema as unknown as MappingBinding['authoredSchema']
      }
      const nextBinding: MappingBinding = {
        mode: draft.mode,
        typeId: draft.typeId,
        fieldMap: draft.fieldMap,
        ...(authoredSchema ? { authoredSchema } : {})
      }
      const nextMapping: MymeMapping = {
        ...currentMapping,
        [kind]: nextBinding
      }
      await setMapping(nextMapping)
      setConfirming(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply mapping.')
    } finally {
      setBusy(false)
    }
  }

  const dirty =
    draft.mode !== binding.mode ||
    draft.typeId !== binding.typeId ||
    !sameFieldMap(draft.fieldMap, binding.fieldMap)

  const editableFieldMap = draft.mode !== 'bundled'

  return (
    <article className="rounded-md border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <div>
          <h4 className="text-[12.5px] font-medium text-foreground capitalize">{kind}s</h4>
          <p className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground">
            {draft.typeId || '—'}
          </p>
        </div>
        <SegmentedModePicker mode={draft.mode} onChange={selectMode} disabled={busy || disabled} />
      </header>

      <div className="space-y-3 px-3.5 py-3">
        {draft.mode === 'existing' && (
          <ExistingTypePicker
            types={typeList}
            loading={typeListLoading}
            value={draft.typeId}
            onChange={pickExistingType}
            onRefresh={() => void refreshTypeList()}
            disabled={busy || disabled}
          />
        )}

        {draft.mode === 'authored' && (
          <AuthoredTypeForm
            typeId={draft.typeId}
            label={draft.authoredLabel}
            onTypeIdChange={setTypeId}
            onLabelChange={setAuthoredLabel}
            disabled={busy || disabled}
          />
        )}

        <FieldMap
          fieldMap={draft.fieldMap}
          sourceOptions={sourceOptions}
          editable={editableFieldMap}
          onChange={setFieldRef}
          onAdd={addTargetField}
          onRemove={removeTargetField}
          disabled={busy || disabled}
        />

        {error && (
          <p className="rounded-md border border-accent-orange/40 bg-accent-orange/10 px-3 py-2 text-[12px] text-accent-orange">
            {error}
          </p>
        )}

        {dirty && !confirming && (
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-transparent px-2.5 text-[12px] text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy || disabled}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-foreground/30 bg-foreground/5 px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        )}

        {confirming && (
          <div className="space-y-2 rounded-md border border-accent-orange/40 bg-accent-orange/10 p-3">
            <p className="text-[12.5px] text-foreground">
              Applying this mapping will trash items synced under the previous binding and re-mint
              them under the new one on the next sync. Old items are soft-deleted, not purged — you
              can recover them via your Myme client.
            </p>
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground hover:bg-foreground/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void applyDraft()}
                disabled={busy}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-accent-orange/60 bg-accent-orange/20 px-3 text-[12px] text-foreground hover:bg-accent-orange/30 disabled:opacity-50"
              >
                {busy ? 'Applying…' : 'Apply & re-mint'}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function SegmentedModePicker({
  mode,
  onChange,
  disabled
}: {
  mode: DraftState['mode']
  onChange: (mode: DraftState['mode']) => void
  disabled?: boolean
}): React.JSX.Element {
  const options: Array<{ value: DraftState['mode']; label: string }> = [
    { value: 'bundled', label: 'Bundled' },
    { value: 'existing', label: 'Existing' },
    { value: 'authored', label: 'Authored' }
  ]
  return (
    <div
      role="radiogroup"
      aria-label="Type mapping mode"
      className="inline-flex rounded-md border border-border bg-floating p-0.5"
    >
      {options.map((opt) => {
        const active = mode === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={
              'inline-flex h-6 items-center rounded-[5px] px-2.5 text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
              (active
                ? 'bg-foreground/10 text-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function ExistingTypePicker({
  types,
  loading,
  value,
  onChange,
  onRefresh,
  disabled
}: {
  types: TypeSummary[] | null
  loading: boolean
  value: string
  onChange: (id: string) => void
  onRefresh: () => void
  disabled?: boolean
}): React.JSX.Element {
  if (loading && !types) {
    return <p className="text-[12px] text-muted-foreground">Loading types…</p>
  }
  if (!types || types.length === 0) {
    return (
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>No types loaded.</span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          className="text-foreground underline-offset-2 hover:underline disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
    )
  }
  const selected = types.find((t) => t.id === value)
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        Target type
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="block w-full appearance-none rounded-md border border-border bg-card px-2.5 py-1.5 pr-8 text-[12.5px] text-foreground focus:border-foreground/30 focus:outline-none disabled:opacity-50"
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label ? `${t.label} — ${t.id}` : t.id}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.8}
        />
      </div>
      {selected?.description && (
        <p className="text-[11.5px] text-muted-foreground">{selected.description}</p>
      )}
    </div>
  )
}

function AuthoredTypeForm({
  typeId,
  label,
  onTypeIdChange,
  onLabelChange,
  disabled
}: {
  typeId: string
  label: string
  onTypeIdChange: (id: string) => void
  onLabelChange: (label: string) => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="block">
        <span className="block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Type id
        </span>
        <input
          type="text"
          value={typeId}
          onChange={(e) => onTypeIdChange(e.target.value)}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="namespace.name"
          className="mt-1 block w-full rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[12px] text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none disabled:opacity-50"
        />
      </label>
      <label className="block">
        <span className="block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Label
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          disabled={disabled}
          placeholder="Human-readable name"
          className="mt-1 block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none disabled:opacity-50"
        />
      </label>
    </div>
  )
}

function FieldMap({
  fieldMap,
  sourceOptions,
  editable,
  onChange,
  onAdd,
  onRemove,
  disabled
}: {
  fieldMap: FieldMap
  sourceOptions: Array<{ value: string; label: string }>
  editable: boolean
  onChange: (target: string, raw: string) => void
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  disabled?: boolean
}): React.JSX.Element {
  const [newField, setNewField] = useState('')
  const entries = Object.entries(fieldMap)

  function commitNew(): void {
    const name = newField.trim()
    if (!name) return
    if (fieldMap[name]) return
    onAdd(name)
    setNewField('')
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Fields
        </span>
        {!editable && (
          <span className="text-[11px] text-muted-foreground">Fixed by the bundled type.</span>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground">
          No fields mapped.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {entries.map(([target, ref]) => (
            <li key={target} className="flex items-center gap-2 px-3 py-1.5">
              <code className="min-w-[8rem] truncate font-mono text-[12px] text-foreground">
                {target}
              </code>
              <span className="text-muted-foreground" aria-hidden>
                ←
              </span>
              {editable ? (
                <div className="relative flex-1">
                  <select
                    value={refValue(ref)}
                    onChange={(e) => onChange(target, e.target.value)}
                    disabled={disabled}
                    className="block w-full appearance-none rounded-md border border-border bg-card px-2 py-1 pr-7 text-[12px] text-foreground focus:border-foreground/30 focus:outline-none disabled:opacity-50"
                  >
                    <option value={UNMAPPED}>— unmapped —</option>
                    {sourceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={1.8}
                  />
                </div>
              ) : (
                <span className="flex-1 truncate text-[12px] text-muted-foreground">
                  {describeRef(ref)}
                </span>
              )}
              {editable && (
                <button
                  type="button"
                  onClick={() => onRemove(target)}
                  disabled={disabled}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
                  title="Remove field"
                >
                  <X className="h-3 w-3" strokeWidth={1.8} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitNew()
              }
            }}
            disabled={disabled}
            placeholder="Add field (e.g. body)"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="flex-1 rounded-md border border-border bg-card px-2.5 py-1 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={commitNew}
            disabled={disabled || !newField.trim()}
            className="inline-flex h-7 items-center rounded-md border border-border bg-floating px-2.5 text-[12px] text-foreground hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

function refValue(ref: SourceFieldRef): string {
  if (ref.kind === 'source') return ref.field
  return UNMAPPED
}

function describeRef(ref: SourceFieldRef): string {
  if (ref.kind === 'literal') {
    if (typeof ref.value === 'string' && ref.value === '') return '"" (empty string)'
    return `${JSON.stringify(ref.value)} (literal)`
  }
  return SOURCE_LABEL[ref.field] ?? ref.field
}

function bindingKey(binding: MappingBinding): string {
  return `${binding.mode}:${binding.typeId}:${JSON.stringify(binding.fieldMap)}`
}

function sameFieldMap(a: FieldMap, b: FieldMap): boolean {
  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  if (aKeys.length !== bKeys.length) return false
  for (let i = 0; i < aKeys.length; i += 1) {
    if (aKeys[i] !== bKeys[i]) return false
  }
  for (const k of aKeys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Bundled / authored / auto-pair defaults (mirror what main does)
// ---------------------------------------------------------------------------

const BUNDLED_RECORDING_MAP: FieldMap = {
  body: { kind: 'source', field: 'recording.transcript' },
  raw_result: { kind: 'source', field: 'recording.rawTranscript' },
  segments: { kind: 'source', field: 'recording.segments' },
  duration_seconds: { kind: 'source', field: 'recording.durationSeconds' },
  model: { kind: 'source', field: 'recording.model' },
  mode: { kind: 'source', field: 'recording.mode' },
  device: { kind: 'source', field: 'recording.device' },
  app_version: { kind: 'source', field: 'recording.appVersion' },
  datetime: { kind: 'source', field: 'recording.datetime' },
  language: { kind: 'source', field: 'recording.language' }
}

const BUNDLED_SESSION_MAP: FieldMap = {
  title: { kind: 'literal', value: '' },
  started_at: { kind: 'source', field: 'session.startedAt' },
  ended_at: { kind: 'source', field: 'session.endedAt' },
  recording_count: { kind: 'source', field: 'session.recordingCount' },
  total_duration_seconds: { kind: 'source', field: 'session.totalDurationSeconds' },
  dominant_mode: { kind: 'source', field: 'session.dominantMode' },
  gap_threshold_minutes: { kind: 'source', field: 'session.gapThresholdMinutes' }
}

function buildBundledFieldMap(kind: 'recording' | 'session'): FieldMap {
  return kind === 'recording' ? { ...BUNDLED_RECORDING_MAP } : { ...BUNDLED_SESSION_MAP }
}

function authoredRecordingDefaults(): FieldMap {
  return {
    body: { kind: 'source', field: 'recording.transcript' },
    raw_result: { kind: 'source', field: 'recording.rawTranscript' },
    duration_seconds: { kind: 'source', field: 'recording.durationSeconds' },
    model: { kind: 'source', field: 'recording.model' },
    mode: { kind: 'source', field: 'recording.mode' },
    device: { kind: 'source', field: 'recording.device' },
    datetime: { kind: 'source', field: 'recording.datetime' }
  }
}

function authoredSessionDefaults(): FieldMap {
  return {
    started_at: { kind: 'source', field: 'session.startedAt' },
    ended_at: { kind: 'source', field: 'session.endedAt' },
    recording_count: { kind: 'source', field: 'session.recordingCount' },
    total_duration_seconds: { kind: 'source', field: 'session.totalDurationSeconds' },
    dominant_mode: { kind: 'source', field: 'session.dominantMode' }
  }
}

const RECORDING_ALIAS: Record<string, string> = {
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
  device: 'recording.device',
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

const SESSION_ALIAS: Record<string, string> = {
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

function autoFieldMapFor(kind: 'recording' | 'session', target: TypeSummary): FieldMap {
  const aliases = kind === 'recording' ? RECORDING_ALIAS : SESSION_ALIAS
  const out: FieldMap = {}
  for (const field of target.fields) {
    const ref = aliases[field.toLowerCase()]
    if (ref) out[field] = { kind: 'source', field: ref } as SourceFieldRef
  }
  if (kind === 'recording' && target.parent === 'core.note') {
    if (!out.body) out.body = { kind: 'source', field: 'recording.transcript' } as SourceFieldRef
    if (!out.title) out.title = { kind: 'source', field: 'recording.excerpt' } as SourceFieldRef
    if (!out.language)
      out.language = { kind: 'source', field: 'recording.language' } as SourceFieldRef
  }
  return out
}

function buildAuthoredSchema(
  kind: 'recording' | 'session',
  draft: DraftState
): {
  id: string
  version: number
  parent?: string
  label?: string
  description?: string
  fields: Record<string, { type: string }>
} {
  const fields: Record<string, { type: string }> = {}
  for (const [target, ref] of Object.entries(draft.fieldMap)) {
    fields[target] = { type: inferFieldType(ref) }
  }
  return {
    id: draft.typeId,
    version: 1,
    parent: kind === 'recording' ? 'core.note' : undefined,
    label: draft.authoredLabel || draft.typeId,
    description:
      kind === 'recording'
        ? 'User-authored mapping for Superwhisper recordings.'
        : 'User-authored mapping for Superwhisper sessions.',
    fields
  }
}

function inferFieldType(ref: SourceFieldRef): string {
  if (ref.kind === 'literal') return typeof ref.value
  switch (ref.field) {
    case 'recording.segments':
      return 'array'
    case 'recording.durationSeconds':
    case 'recording.wordCount':
    case 'recording.wordsPerMinute':
    case 'session.recordingCount':
    case 'session.totalDurationSeconds':
    case 'session.gapThresholdMinutes':
      return 'number'
    case 'recording.datetime':
    case 'session.startedAt':
    case 'session.endedAt':
      return 'datetime'
    default:
      return 'string'
  }
}
