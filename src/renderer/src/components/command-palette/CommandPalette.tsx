import { useGlobalShortcut } from '@renderer/hooks/useGlobalShortcut'
import { formatDurationSec, formatTimestamp } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import type { Recording } from '@renderer/lib/types'
import { usePaletteStore, type PaletteMode } from '@renderer/state/paletteStore'
import { useThemeStore } from '@renderer/state/themeStore'
import { Command, useCommandState } from 'cmdk'
import {
  AudioLines,
  CornerDownLeft,
  House,
  Languages,
  Monitor,
  Moon,
  Search as SearchIcon,
  Settings,
  Sun,
  TextSearch
} from 'lucide-react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const DESTINATIONS = [
  { to: '/', label: 'Go to Overview', icon: House },
  { to: '/usage', label: 'Go to Usage', icon: AudioLines },
  { to: '/language', label: 'Go to Language', icon: Languages },
  { to: '/transcripts', label: 'Go to Transcripts', icon: TextSearch },
  { to: '/settings', label: 'Open Settings', icon: Settings }
]

const SEARCH_MAX_RESULTS = 30

/**
 * Two-mode overlay surface — the same shell renders either:
 *   • Command mode  (⌘K)  — appearance + navigation actions
 *   • Search mode   (sidebar 🔍) — substring filter over recordings
 *
 * The mode toggle in the bottom-right swaps between them in place.
 * The icon left of the input reflects the current mode (⌘ or 🔍).
 */
export function CommandPalette(): React.JSX.Element | null {
  const open = usePaletteStore((s) => s.open)
  const setOpen = usePaletteStore((s) => s.setOpen)
  const togglePalette = usePaletteStore((s) => s.toggle)
  const mode = usePaletteStore((s) => s.mode)
  const setMode = usePaletteStore((s) => s.setMode)

  const close = useCallback(() => setOpen(false), [setOpen])
  // Cmd-K opens command mode (or closes whichever mode is open).
  useGlobalShortcut({ key: 'k', mod: true }, () => togglePalette('command'))
  useGlobalShortcut({ key: 'escape' }, close)

  if (!open) return null

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/8 pt-[16vh]"
    >
      <Command
        loop
        // cmdk default filter only works for Item values; in search mode we
        // do our own filtering, so disable the built-in shouldFilter there.
        shouldFilter={mode === 'command'}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-float)]"
      >
        <PaletteHeader mode={mode} />

        {mode === 'command' ? <CommandModeBody close={close} /> : <SearchModeBody close={close} />}

        <PaletteFooter mode={mode} onSwitchMode={setMode} />
      </Command>
    </div>
  )
}

function PaletteHeader({ mode }: { mode: PaletteMode }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
      {mode === 'command' ? (
        <CommandGlyph />
      ) : (
        <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      )}
      <Command.Input
        autoFocus
        placeholder={mode === 'command' ? 'Run a command…' : 'Search transcripts…'}
        className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

/** Glyph for command mode — drawn ⌘ with the same stroke as lucide icons. */
function CommandGlyph(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted-foreground"
      aria-hidden
    >
      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

function CommandModeBody({ close }: { close: () => void }): React.JSX.Element {
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)
  const navigate = useNavigate()
  const run = (action: () => void): void => {
    action()
    close()
  }

  return (
    <Command.List className="max-h-[50vh] overflow-y-auto p-2">
      <Command.Empty className="px-3 py-10 text-center text-[13px] text-muted-foreground">
        No results.
      </Command.Empty>

      <PaletteGroup heading="Navigation">
        {DESTINATIONS.map((d) => (
          <PaletteItem
            key={d.to}
            icon={d.icon}
            label={d.label}
            onSelect={() => run(() => navigate(d.to))}
          />
        ))}
      </PaletteGroup>

      <PaletteGroup heading="Appearance">
        <PaletteItem
          icon={Sun}
          label={pref === 'light' ? 'Light (current)' : 'Light'}
          onSelect={() => run(() => setPref('light'))}
        />
        <PaletteItem
          icon={Moon}
          label={pref === 'dark' ? 'Dark (current)' : 'Dark'}
          onSelect={() => run(() => setPref('dark'))}
        />
        <PaletteItem
          icon={Monitor}
          label={pref === 'system' ? 'System (current)' : 'System'}
          onSelect={() => run(() => setPref('system'))}
        />
      </PaletteGroup>
    </Command.List>
  )
}

function SearchModeBody({ close }: { close: () => void }): React.JSX.Element {
  const navigate = useNavigate()
  // Reads cmdk's internal input value — no need to control or duplicate
  // the input element. Re-renders only when the search string changes.
  const query = useCommandState((state) => state.search) as string

  return (
    <Command.List className="max-h-[50vh] overflow-y-auto p-2">
      {query.trim().length === 0 ? (
        <div className="px-3 py-10 text-center text-[13px] text-muted-foreground">
          Type to search transcripts.
        </div>
      ) : (
        <SearchResults
          query={query}
          onPick={(rec) => {
            navigate(`/transcripts/${rec.id}`)
            close()
          }}
        />
      )}
    </Command.List>
  )
}

function SearchResults({
  query,
  onPick
}: {
  query: string
  onPick: (rec: Recording) => void
}): React.JSX.Element {
  const q = query.trim().toLowerCase()
  const matches = mock.recordings
    .filter((r) => r.result.toLowerCase().includes(q) || r.modeName.toLowerCase().includes(q))
    .slice(0, SEARCH_MAX_RESULTS)

  if (matches.length === 0) {
    return (
      <div className="px-3 py-10 text-center text-[13px] text-muted-foreground">No matches.</div>
    )
  }

  return (
    <Command.Group>
      {matches.map((r) => (
        <Command.Item
          key={r.id}
          value={`${r.id} ${r.result}`}
          onSelect={() => onPick(r)}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px] text-foreground transition-colors aria-selected:bg-foreground/8"
        >
          <span className="min-w-0 flex flex-col">
            <span className="truncate text-foreground">{formatTimestamp(r.datetime)}</span>
            <span className="truncate text-[11.5px] text-muted-foreground">
              {highlight(r.result.slice(0, 120), q)}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-secondary-foreground">
              {r.modeName}
            </span>
            <span className="tabular-nums">{formatDurationSec(r.duration / 1000)}</span>
          </span>
        </Command.Item>
      ))}
    </Command.Group>
  )
}

/** Highlights the matched substring inside a snippet — pure render, no DOM. */
function highlight(text: string, q: string): React.ReactNode {
  if (q.length === 0) return text
  const idx = text.toLowerCase().indexOf(q)
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-foreground/15 text-foreground">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

function PaletteGroup({
  heading,
  children
}: {
  heading: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
    >
      {children}
    </Command.Group>
  )
}

interface PaletteItemProps {
  icon: typeof SearchIcon
  label: string
  shortcut?: string
  onSelect: () => void
}

function PaletteItem({
  icon: Icon,
  label,
  shortcut,
  onSelect
}: PaletteItemProps): React.JSX.Element {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px] text-foreground transition-colors aria-selected:bg-foreground/8"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
        <span className="truncate">{label}</span>
      </span>
      {shortcut && <kbd className="text-[11px] text-muted-foreground">{shortcut}</kbd>}
    </Command.Item>
  )
}

function PaletteFooter({
  mode,
  onSwitchMode
}: {
  mode: PaletteMode
  onSwitchMode: (m: PaletteMode) => void
}): React.JSX.Element {
  const otherMode: PaletteMode = mode === 'command' ? 'search' : 'command'
  return (
    <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        Select
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>
          <CornerDownLeft className="h-2.5 w-2.5" strokeWidth={2} />
        </Kbd>
        Open
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>esc</Kbd>
        Close
      </span>
      <button
        type="button"
        onClick={() => onSwitchMode(otherMode)}
        className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
        aria-label={otherMode === 'search' ? 'Switch to search' : 'Switch to commands'}
      >
        {otherMode === 'search' ? (
          <>
            <SearchIcon className="h-3 w-3" strokeWidth={1.8} />
            Search
          </>
        ) : (
          <>
            <Kbd>⌘</Kbd>
            Commands
          </>
        )}
      </button>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <kbd className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-border bg-background px-1 py-0.5 font-sans text-[10px] text-muted-foreground">
      {children}
    </kbd>
  )
}
