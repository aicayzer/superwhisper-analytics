import { useGlobalShortcut } from '@renderer/hooks/useGlobalShortcut'
import { usePaletteStore } from '@renderer/state/paletteStore'
import { useThemeStore } from '@renderer/state/themeStore'
import { Command } from 'cmdk'
import {
  ArrowRight,
  CornerDownLeft,
  House,
  AudioLines,
  Languages,
  Monitor,
  Moon,
  Search,
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

/**
 * Command palette — ⌘K to open, Esc to close. Wave-1 commands:
 *   - Toggle theme
 *   - Jump to a screen
 *
 * Real transcript search joins in wave 2.
 */
export function CommandPalette(): React.JSX.Element | null {
  const open = usePaletteStore((s) => s.open)
  const setOpen = usePaletteStore((s) => s.setOpen)
  const togglePalette = usePaletteStore((s) => s.toggle)
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)
  const navigate = useNavigate()

  const close = useCallback(() => setOpen(false), [setOpen])
  useGlobalShortcut({ key: 'k', mod: true }, togglePalette)
  useGlobalShortcut({ key: 'escape' }, close)

  if (!open) return null

  const run = (action: () => void): void => {
    action()
    close()
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/8 pt-[16vh]"
    >
      <Command
        loop
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-float)]"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <Command.Input
            autoFocus
            placeholder="Search or run a command"
            className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <Command.List className="max-h-[50vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-10 text-center text-[13px] text-muted-foreground">
            No results.
          </Command.Empty>

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
        </Command.List>

        <PaletteFooter />
      </Command>
    </div>
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
  icon: typeof Search
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

function PaletteFooter(): React.JSX.Element {
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
      {/* Hidden import keeps lucide tree-shake stable when the only consumer is dynamic */}
      <span className="hidden">
        <ArrowRight />
      </span>
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
