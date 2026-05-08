import { useResize } from '@renderer/hooks/useResize'
import { cn } from '@renderer/lib/cn'
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, useLayoutStore } from '@renderer/state/layoutStore'
import { AudioLines, House, Languages, RefreshCw, Settings, TextSearch } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ResizeHandle } from './ResizeHandle'
import { SidebarHeader } from './SidebarHeader'

const NAV = [
  { to: '/', label: 'Overview', icon: House },
  { to: '/usage', label: 'Usage', icon: AudioLines },
  { to: '/language', label: 'Language', icon: Languages },
  { to: '/transcripts', label: 'Transcripts', icon: TextSearch }
] as const

const INDEXED_AT = Date.now() - 1000 * 60 * 11 // mock — "11 minutes ago"

function relativeTime(from: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - from) / 1000))
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
 * Floating sidebar overlay. Holds nav items + indexer footer with refresh
 * and settings cog. Drag-resizes from its right edge.
 */
export function Sidebar(): React.JSX.Element {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth)
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth)

  const { startResize, isResizing } = useResize({
    direction: 'grow-right',
    min: SIDEBAR_MIN_WIDTH,
    max: SIDEBAR_MAX_WIDTH,
    getCurrentWidth: () => sidebarWidth,
    onChange: setSidebarWidth
  })

  useNow(30_000) // re-render every 30s so the indexer label refreshes

  return (
    <aside
      style={{ width: sidebarWidth }}
      aria-hidden={!sidebarOpen}
      className={cn(
        'absolute top-2 bottom-2 left-2 z-20',
        'flex flex-col rounded-xl border border-border bg-card shadow-[var(--shadow-float)]',
        !isResizing && 'transition-[transform,opacity] duration-200 ease-out',
        !sidebarOpen && '-translate-x-[calc(100%+0.5rem)] opacity-0 pointer-events-none'
      )}
    >
      <SidebarHeader />

      <nav className="flex-1 overflow-y-auto px-2 pb-2 text-[13px]">
        <ul className="space-y-px">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors [-webkit-app-region:no-drag]',
                    isActive
                      ? 'bg-foreground/8 font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
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

      <footer className="flex items-center gap-1 border-t border-border px-2.5 py-1.5 text-[11px] text-muted-foreground [-webkit-app-region:no-drag]">
        <span className="flex-1 truncate" title={new Date(INDEXED_AT).toLocaleString()}>
          Indexed {relativeTime(INDEXED_AT)}
        </span>
        <button
          type="button"
          aria-label="Refresh"
          title="Refresh (placeholder)"
          className="rounded p-1 transition-colors hover:bg-foreground/8 hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" strokeWidth={1.8} />
        </button>
        <NavLink
          to="/settings"
          aria-label="Settings"
          title="Settings"
          className={({ isActive }) =>
            cn(
              'rounded p-1 transition-colors hover:bg-foreground/8 hover:text-foreground',
              isActive && 'bg-foreground/8 text-foreground'
            )
          }
        >
          <Settings className="h-3 w-3" strokeWidth={1.8} />
        </NavLink>
      </footer>

      <ResizeHandle edge="right" onPointerDown={startResize} />
    </aside>
  )
}
