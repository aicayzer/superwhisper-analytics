import { IconButton } from '@renderer/components/ui/IconButton'
import { useResize } from '@renderer/hooks/useResize'
import { cn } from '@renderer/lib/cn'
import { useConfigStore } from '@renderer/state/configStore'
import { useDataStore } from '@renderer/state/dataStore'
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, useLayoutStore } from '@renderer/state/layoutStore'
import { usePaletteStore } from '@renderer/state/paletteStore'
import {
  AudioLines,
  House,
  Languages,
  PanelLeft,
  RefreshCw,
  Search,
  Settings,
  TextSearch
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ResizeHandle } from './ResizeHandle'

const NAV = [
  { to: '/', label: 'Overview', icon: House },
  { to: '/usage', label: 'Usage', icon: AudioLines },
  { to: '/language', label: 'Language', icon: Languages },
  { to: '/transcripts', label: 'Transcripts', icon: TextSearch }
] as const

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (diffSec < 30) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffD = Math.floor(diffHr / 24)
  return `${diffD}d ago`
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs])
  return now
}

/**
 * Floating sidebar overlay — Claude-desktop pattern.
 *
 * Sits at top-2 / left-2 / bottom-2. Internal padding-top reserves room
 * for the macOS traffic lights (positioned by Electron at x=18 y=18, which
 * land inside the sidebar's top-left). The toggle button lives in the
 * sidebar's header row, just to the right of the traffic-light area.
 *
 * When the sidebar is hidden, the toggle hops to the MainHeader so traffic
 * lights and toggle always travel together.
 */
export function Sidebar(): React.JSX.Element {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth)
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth)
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen)
  const peekActive = useLayoutStore((s) => s.peekActive)
  const setPeek = useLayoutStore((s) => s.setPeek)
  const openPalette = usePaletteStore((s) => s.openWith)
  const indexedAt = useDataStore((s) => s.indexedAt)
  const loading = useDataStore((s) => s.loading)
  const reindexing = useDataStore((s) => s.reindexing)
  const reindex = useDataStore((s) => s.reindex)
  const configValid = useConfigStore((s) => s.isValid)
  const busy = loading || reindexing
  const reindexDisabled = busy || !configValid

  const { startResize, isResizing } = useResize({
    direction: 'grow-right',
    min: SIDEBAR_MIN_WIDTH,
    max: SIDEBAR_MAX_WIDTH,
    getCurrentWidth: () => sidebarWidth,
    onChange: setSidebarWidth
  })

  // Tick once per 10s so the "Indexed Xm ago" string refreshes alongside
  // Settings' StatusText. Cheap.
  useNow(10_000)

  const indexedLabel = (() => {
    if (loading) return 'Scanning…'
    if (reindexing) return 'Reindexing…'
    if (indexedAt) return `Indexed ${relativeTime(indexedAt)}`
    return configValid ? 'Not yet indexed' : 'No folder configured'
  })()

  // "visible" covers both the locked-open state and the transient peek
  // state — visually identical, but peek doesn't persist on click-outside.
  const visible = sidebarOpen || peekActive
  return (
    <aside
      style={{ width: sidebarWidth }}
      aria-hidden={!visible}
      onPointerLeave={() => {
        if (!sidebarOpen && peekActive) setPeek(false)
      }}
      onClick={() => {
        // Promote a peek into a locked-open sidebar on any click inside.
        // The user has signalled intent, so keep it on screen until they
        // explicitly close it with Cmd-B or the toggle.
        if (!sidebarOpen && peekActive) setSidebarOpen(true)
      }}
      className={cn(
        'absolute bottom-2 left-2 top-2 z-20',
        'flex flex-col rounded-xl border border-border bg-floating shadow-[var(--shadow-float)] [-webkit-app-region:drag]',
        !isResizing && 'transition-[transform,opacity] duration-200 ease-out',
        !visible && '-translate-x-[calc(100%+0.5rem)] opacity-0 pointer-events-none'
      )}
    >
      {/* Header band — traffic lights live in the left third (Electron-native,
          x=18 y=18). Hide-toggle and Search sit on the right, in that order. */}
      <div className="flex h-9 items-center justify-end gap-0.5 pl-[68px] pr-1.5">
        <IconButton onClick={toggleSidebar} aria-label="Hide sidebar" title="Hide sidebar">
          <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
        </IconButton>
        <IconButton
          onClick={() => openPalette('search')}
          aria-label="Search transcripts"
          title="Search transcripts"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={1.8} />
        </IconButton>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pt-1 pb-2 text-[13px] [-webkit-app-region:no-drag]">
        <ul className="space-y-px">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
                    isActive
                      ? 'bg-foreground/[0.05] font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground'
                  )
                }
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <footer className="flex items-center gap-0.5 px-1.5 py-1 text-[11px] text-muted-foreground [-webkit-app-region:no-drag]">
        <span
          className="flex-1 truncate px-1"
          title={indexedAt ? new Date(indexedAt).toLocaleString() : undefined}
        >
          {indexedLabel}
        </span>
        <IconButton
          onClick={() => void reindex()}
          disabled={reindexDisabled}
          aria-label="Reindex recordings"
          title={configValid ? 'Reindex recordings' : 'Pick a valid folder in Settings first'}
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', reindexing && 'animate-spin')}
            strokeWidth={1.8}
          />
        </IconButton>
        <SettingsLink />
      </footer>

      <ResizeHandle edge="right" onPointerDown={startResize} />
    </aside>
  )
}

/** Settings tab in the footer — IconButton wrapping a NavLink so we keep
 *  active-state styling while inheriting the shared chrome. NavLink stamps
 *  `aria-current="page"` when on /settings; we pick it up via Tailwind's
 *  aria-current variant so we don't need a function-form className that
 *  Slot can't merge. */
function SettingsLink(): React.JSX.Element {
  return (
    <IconButton
      asChild
      className="aria-[current=page]:bg-foreground/5 aria-[current=page]:text-foreground"
    >
      <NavLink to="/settings" aria-label="Settings" title="Settings">
        <Settings className="h-3.5 w-3.5" strokeWidth={1.8} />
      </NavLink>
    </IconButton>
  )
}
