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

/**
 * Analysis → Filler dictionary.
 *
 * Grouped by category instead of a flat 170-phrase chip cloud. Each
 * category row carries:
 *
 *   • Chevron to expand / collapse the chip list.
 *   • Title + small count badge.
 *   • Preview subtitle showing the first few phrases.
 *   • A switch on the right — toggles all phrases in the category in
 *     bulk. A category counts as "on" iff at least one of its phrases
 *     is in the active list.
 *
 * Expanding a category reveals a chip cloud; each chip has an × to
 * drop that individual phrase. A dashed "+ add" chip at the end opens
 * an inline input — phrases added there land in the active set as
 * "custom" entries, surfaced in a "Custom" bucket below the default
 * categories.
 *
 * No search in v1 — with six categories and at most 39 phrases each,
 * the cloud reads fine. If the phrase count balloons we'll add a
 * header-icon search affordance.
 */
export function FillerDictionaryCard(): React.JSX.Element {
  const fillerWords = useConfigStore((s) => s.fillerWords)
  const setFillerWords = useConfigStore((s) => s.setFillerWords)
  const [openId, setOpenId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const active = useMemo(() => new Set(fillerWords), [fillerWords])
  const totalActive = fillerWords.length

  // Compute "custom" phrases — anything in `fillerWords` that doesn't
  // belong to any default category.
  const customPhrases = useMemo(() => {
    const known = new Set(DEFAULT_FILLER_PHRASES_FROM_CATEGORIES)
    return fillerWords.filter((w) => !known.has(w))
  }, [fillerWords])

  // Default list — used by the Reset link.
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
      // Add any missing category phrases, preserving the existing
      // active order, then appending whatever's missing in canonical order.
      const next = [...fillerWords]
      for (const p of cat.phrases) {
        if (!active.has(p)) next.push(p)
      }
      await commit(normalisePhrases(next))
    } else {
      await commit(fillerWords.filter((w) => !inCat.has(w)))
    }
  }

  async function removePhrase(phrase: string): Promise<void> {
    await commit(fillerWords.filter((w) => w !== phrase))
  }

  async function addPhrase(): Promise<void> {
    const merged = normalisePhrases([...fillerWords, draft])
    setDraft('')
    setAddingId(null)
    if (merged.length === fillerWords.length) return
    await commit(merged)
  }

  async function resetToDefaults(): Promise<void> {
    await commit([...DEFAULT_FILLER_PHRASES_FROM_CATEGORIES])
  }

  return (
    <SettingsCard
      icon={BookOpen}
      title="Filler dictionary"
      subtitle="Grouped by category. Toggle a whole category, or open it to edit individual phrases."
      headerExtra={
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {totalActive} phrase{totalActive === 1 ? '' : 's'}
        </span>
      }
    >
      <div className="-mx-5 -my-4 divide-y divide-border">
        {DEFAULT_FILLER_CATEGORIES.map((cat) => (
          <CategoryRow
            key={cat.id}
            category={cat}
            active={categoryActive(cat)}
            open={openId === cat.id}
            adding={addingId === cat.id}
            draft={addingId === cat.id ? draft : ''}
            busy={busy}
            activeSet={active}
            onToggleCategory={(on) => void toggleCategory(cat, on)}
            onToggleOpen={() => setOpenId(openId === cat.id ? null : cat.id)}
            onRemovePhrase={(p) => void removePhrase(p)}
            onStartAdd={() => {
              setAddingId(cat.id)
              setDraft('')
            }}
            onCancelAdd={() => {
              setAddingId(null)
              setDraft('')
            }}
            onChangeDraft={setDraft}
            onCommitAdd={() => void addPhrase()}
          />
        ))}
        {customPhrases.length > 0 && (
          <CustomBucket
            phrases={customPhrases}
            busy={busy}
            onRemove={(p) => void removePhrase(p)}
          />
        )}
        <div className="flex items-center justify-end gap-3 px-5 py-3 text-[12px]">
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
  category: FillerCategory
  active: boolean
  open: boolean
  adding: boolean
  draft: string
  busy: boolean
  activeSet: Set<string>
  onToggleCategory: (on: boolean) => void
  onToggleOpen: () => void
  onRemovePhrase: (phrase: string) => void
  onStartAdd: () => void
  onCancelAdd: () => void
  onChangeDraft: (next: string) => void
  onCommitAdd: () => void
}

function CategoryRow({
  category,
  active,
  open,
  adding,
  draft,
  busy,
  activeSet,
  onToggleCategory,
  onToggleOpen,
  onRemovePhrase,
  onStartAdd,
  onCancelAdd,
  onChangeDraft,
  onCommitAdd
}: CategoryRowProps): React.JSX.Element {
  const visiblePhrases = category.phrases.filter((p) => activeSet.has(p))
  const preview = visiblePhrases.slice(0, 4).join(' · ') || '(all removed)'
  return (
    <div className="px-5">
      <div className="flex items-center justify-between gap-3 py-3">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              'mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
              !open && '-rotate-90'
            )}
            strokeWidth={1.8}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-medium text-foreground">{category.label}</span>
              <span className="rounded bg-foreground/[0.06] px-1.5 py-px text-[10.5px] tabular-nums text-muted-foreground">
                {visiblePhrases.length}
              </span>
            </div>
            <div
              className={cn(
                'mt-0.5 truncate text-[12px]',
                active ? 'text-muted-foreground' : 'text-muted-foreground/60'
              )}
            >
              {preview}
            </div>
          </div>
        </button>
        <Switch
          checked={active}
          onChange={onToggleCategory}
          ariaLabel={`Toggle ${category.label}`}
        />
      </div>
      {open && (
        <div className="pb-3">
          <div className="flex flex-wrap gap-1.5">
            {visiblePhrases.length === 0 ? (
              <span className="px-1 text-[12px] text-muted-foreground">
                No phrases active. Toggle the switch above to add the defaults back.
              </span>
            ) : (
              visiblePhrases.map((phrase) => (
                <span
                  key={phrase}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[12px] text-foreground"
                >
                  {phrase}
                  <button
                    type="button"
                    onClick={() => onRemovePhrase(phrase)}
                    disabled={busy}
                    aria-label={`Remove "${phrase}"`}
                    title={`Remove "${phrase}"`}
                    className="rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </span>
              ))
            )}
            {adding ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  onCommitAdd()
                }}
                className="inline-flex items-center gap-1"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => onChangeDraft(e.target.value)}
                  onBlur={() => {
                    if (!draft.trim()) onCancelAdd()
                  }}
                  autoFocus
                  placeholder="phrase…"
                  className="h-6 w-32 rounded-md border border-border bg-card px-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/40"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={onStartAdd}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-[12px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                add
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CustomBucket({
  phrases,
  busy,
  onRemove
}: {
  phrases: string[]
  busy: boolean
  onRemove: (phrase: string) => void
}): React.JSX.Element {
  return (
    <div className="px-5 py-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] font-medium text-foreground">Custom</span>
        <span className="rounded bg-foreground/[0.06] px-1.5 py-px text-[10.5px] tabular-nums text-muted-foreground">
          {phrases.length}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {phrases.map((phrase) => (
          <span
            key={phrase}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[12px] text-foreground"
          >
            {phrase}
            <button
              type="button"
              onClick={() => onRemove(phrase)}
              disabled={busy}
              aria-label={`Remove "${phrase}"`}
              className="rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
