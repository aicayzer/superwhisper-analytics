import {
  DEFAULT_FILLER_CATEGORIES,
  normalisePhrases,
  type FillerCategory
} from '@shared/text-metrics'
import { DEFAULT_FILLER_PHRASES_FROM_CATEGORIES } from '@shared/filler-categories'
import { Switch } from '@renderer/components/ui/Switch'
import { useConfigStore } from '@renderer/state/configStore'
import { cn } from '@renderer/lib/cn'
import { BookOpen, ChevronDown, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SettingsCard } from './SettingsCard'

const CUSTOM_ID = '__custom__'

/**
 * Analysis → Filler dictionary.
 *
 * Categories live inside a bordered inner container — box-within-a-box,
 * so the row dividers don't bleed to the card edge. Each row shows:
 *
 *   • Chevron to expand / collapse.
 *   • Plain title.
 *   • When closed, an inline preview "um · uh · er · hmm · +28 more"
 *     (replaces the separate count pill).
 *   • A switch on the right that bulk-toggles every phrase in the
 *     category.
 *
 * Opening a category swaps the preview line out for a chip cloud below.
 * Each chip is `rounded-full` with an × to drop the phrase; a dashed
 * `+ add` chip at the end opens an inline input — Enter saves, Escape
 * or blur-without-text cancels.
 *
 * `Custom` is rendered as a regular toggleable row (only when there
 * are phrases the default categories don't cover). Reset link sits
 * outside the box, bottom-right.
 */
export function FillerDictionaryCard(): React.JSX.Element {
  const fillerWords = useConfigStore((s) => s.fillerWords)
  const setFillerWords = useConfigStore((s) => s.setFillerWords)
  const [openId, setOpenId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const active = useMemo(() => new Set(fillerWords), [fillerWords])

  // Phrases in `fillerWords` that aren't in any default category.
  const customPhrases = useMemo(() => {
    const known = new Set(DEFAULT_FILLER_PHRASES_FROM_CATEGORIES)
    return fillerWords.filter((w) => !known.has(w))
  }, [fillerWords])

  const isDefault =
    fillerWords.length === DEFAULT_FILLER_PHRASES_FROM_CATEGORIES.length &&
    fillerWords.every((w, i) => w === DEFAULT_FILLER_PHRASES_FROM_CATEGORIES[i])

  async function commit(next: string[]): Promise<void> {
    setBusy(true)
    try {
      await setFillerWords(next)
    } finally {
      setBusy(false)
    }
  }

  function categoryActive(cat: FillerCategory): boolean {
    return cat.phrases.some((p) => active.has(p))
  }

  async function toggleCategory(cat: FillerCategory, on: boolean): Promise<void> {
    const inCat = new Set(cat.phrases)
    if (on) {
      const next = [...fillerWords]
      for (const p of cat.phrases) if (!active.has(p)) next.push(p)
      await commit(normalisePhrases(next))
    } else {
      await commit(fillerWords.filter((w) => !inCat.has(w)))
    }
  }

  async function toggleCustom(on: boolean): Promise<void> {
    if (on) return // can't bulk-enable without phrases
    await commit(fillerWords.filter((w) => !customPhrases.includes(w)))
  }

  async function removePhrase(phrase: string): Promise<void> {
    await commit(fillerWords.filter((w) => w !== phrase))
  }

  async function commitDraft(): Promise<void> {
    const merged = normalisePhrases([...fillerWords, draft])
    setDraft('')
    setAddingId(null)
    if (merged.length === fillerWords.length) return
    await commit(merged)
  }

  function cancelDraft(): void {
    setDraft('')
    setAddingId(null)
  }

  async function resetToDefaults(): Promise<void> {
    await commit([...DEFAULT_FILLER_PHRASES_FROM_CATEGORIES])
  }

  return (
    <SettingsCard
      icon={BookOpen}
      title="Filler dictionary"
      subtitle="Grouped by category. Toggle a whole category, or open it to edit phrases."
    >
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="divide-y divide-border">
            {DEFAULT_FILLER_CATEGORIES.map((cat) => (
              <CategoryRow
                key={cat.id}
                title={cat.label}
                phrases={cat.phrases}
                activeSet={active}
                isActive={categoryActive(cat)}
                isOpen={openId === cat.id}
                isAdding={addingId === cat.id}
                draft={addingId === cat.id ? draft : ''}
                busy={busy}
                onToggleCategory={(on) => void toggleCategory(cat, on)}
                onToggleOpen={() => setOpenId(openId === cat.id ? null : cat.id)}
                onRemovePhrase={(p) => void removePhrase(p)}
                onStartAdd={() => {
                  setAddingId(cat.id)
                  setDraft('')
                }}
                onCancelAdd={cancelDraft}
                onChangeDraft={setDraft}
                onCommitAdd={() => void commitDraft()}
              />
            ))}
            {customPhrases.length > 0 && (
              <CategoryRow
                title="Custom"
                phrases={customPhrases}
                activeSet={active}
                isActive
                isOpen={openId === CUSTOM_ID}
                isAdding={addingId === CUSTOM_ID}
                draft={addingId === CUSTOM_ID ? draft : ''}
                busy={busy}
                onToggleCategory={(on) => void toggleCustom(on)}
                onToggleOpen={() => setOpenId(openId === CUSTOM_ID ? null : CUSTOM_ID)}
                onRemovePhrase={(p) => void removePhrase(p)}
                onStartAdd={() => {
                  setAddingId(CUSTOM_ID)
                  setDraft('')
                }}
                onCancelAdd={cancelDraft}
                onChangeDraft={setDraft}
                onCommitAdd={() => void commitDraft()}
              />
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 text-[12px]">
          <button
            type="button"
            onClick={() => void resetToDefaults()}
            disabled={busy || isDefault}
            title={isDefault ? 'Already at defaults' : 'Reset to the built-in dictionary'}
            className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted-foreground"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </SettingsCard>
  )
}

interface CategoryRowProps {
  title: string
  phrases: readonly string[]
  activeSet: Set<string>
  isActive: boolean
  isOpen: boolean
  isAdding: boolean
  draft: string
  busy: boolean
  onToggleCategory: (on: boolean) => void
  onToggleOpen: () => void
  onRemovePhrase: (phrase: string) => void
  onStartAdd: () => void
  onCancelAdd: () => void
  onChangeDraft: (next: string) => void
  onCommitAdd: () => void
}

function CategoryRow({
  title,
  phrases,
  activeSet,
  isActive,
  isOpen,
  isAdding,
  draft,
  busy,
  onToggleCategory,
  onToggleOpen,
  onRemovePhrase,
  onStartAdd,
  onCancelAdd,
  onChangeDraft,
  onCommitAdd
}: CategoryRowProps): React.JSX.Element {
  const visiblePhrases = phrases.filter((p) => activeSet.has(p))
  const PREVIEW_COUNT = 4
  const previewHead = visiblePhrases.slice(0, PREVIEW_COUNT).join(' · ')
  const extra = Math.max(0, visiblePhrases.length - PREVIEW_COUNT)
  const previewLine =
    visiblePhrases.length === 0
      ? '(all removed)'
      : extra > 0
        ? `${previewHead} · +${extra} more`
        : previewHead

  return (
    <div className="px-4 py-3">
      {/* Title row — fixed-height so the switch stays vertically
          centered against the title regardless of whether the row
          below renders a preview, a chip cloud, or nothing. */}
      <div className="flex min-h-[26px] items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
              !isOpen && '-rotate-90'
            )}
            strokeWidth={1.8}
          />
          <span className="block truncate text-[13px] font-medium text-foreground">{title}</span>
        </button>
        <Switch checked={isActive} onChange={onToggleCategory} ariaLabel={`Toggle ${title}`} />
      </div>
      {/* Preview / chip cloud — indented to align with the title text
          (chevron width + gap), not the chevron itself. */}
      {!isOpen && (
        <div
          className={cn(
            'mt-0.5 truncate pl-[22px] text-[12px]',
            isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'
          )}
        >
          {previewLine}
        </div>
      )}
      {isOpen && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-[22px]">
          {visiblePhrases.length === 0 ? (
            <span className="text-[12px] text-muted-foreground">
              No phrases active. Toggle the switch above to add the defaults back.
            </span>
          ) : (
            visiblePhrases.map((phrase) => (
              <Chip
                key={phrase}
                label={phrase}
                onRemove={() => onRemovePhrase(phrase)}
                disabled={busy}
              />
            ))
          )}
          {isAdding ? (
            <AddInput
              draft={draft}
              onChange={onChangeDraft}
              onCommit={onCommitAdd}
              onCancel={onCancelAdd}
            />
          ) : (
            <button
              type="button"
              onClick={onStartAdd}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[12px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3 w-3" strokeWidth={2} />
              add
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({
  label,
  onRemove,
  disabled
}: {
  label: string
  onRemove: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[12px] text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove "${label}"`}
        title={`Remove "${label}"`}
        className="rounded-full text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>
    </span>
  )
}

function AddInput({
  draft,
  onChange,
  onCommit,
  onCancel
}: {
  draft: string
  onChange: (next: string) => void
  onCommit: () => void
  onCancel: () => void
}): React.JSX.Element {
  // Plain input with explicit key handling. Avoids `<form>` — a form
  // here was being swallowed somewhere and Enter wasn't reaching
  // onSubmit. onKeyDown is reliable.
  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onCommit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      onBlur={() => {
        if (!draft.trim()) onCancel()
      }}
      autoFocus
      placeholder="new phrase"
      className="h-[26px] w-32 rounded-full border border-border bg-card px-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40"
    />
  )
}
