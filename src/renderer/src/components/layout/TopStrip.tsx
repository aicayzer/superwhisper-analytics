import { useLayoutStore } from '@renderer/state/layoutStore'
import { PanelLeft, Search } from 'lucide-react'
import { useState } from 'react'

interface TopStripProps {
  title: string
  showSearch: boolean
}

const RANGE_OPTIONS = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
  { id: '365', label: 'Last 12 months' },
  { id: 'all', label: 'All time' }
]

/**
 * Single top strip spanning the full window. Replaces the foundation's
 * Titlebar + a separate Topbar.
 *
 * Drag region (so the user can drag the window) with no-drag overrides on
 * interactive elements. `pl-[88px]` reserves room for the native macOS
 * traffic lights — h-12 + items-center puts every control's vertical centre
 * at y=24, the same as `trafficLightPosition: { y: 18 }`.
 *
 * The sidebar floats *below* this strip, so the toggle on the left always
 * has a clear hit area regardless of sidebar state.
 */
export function TopStrip({ title, showSearch }: TopStripProps): React.JSX.Element {
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const [range, setRange] = useState('90')
  const [search, setSearch] = useState('')

  return (
    <div className="absolute left-0 right-0 top-0 z-30 flex h-12 items-center gap-2 bg-background pl-[88px] pr-3 [-webkit-app-region:drag]">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground [-webkit-app-region:no-drag]"
      >
        <PanelLeft className="h-4 w-4" strokeWidth={1.8} />
      </button>

      <h1 className="select-none text-[14px] font-semibold tracking-tight text-foreground">
        {title}
      </h1>

      {showSearch && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [-webkit-app-region:no-drag]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.8}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transcripts"
              className="h-8 w-[320px] rounded-md border border-border bg-card pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
      )}

      <div className="ml-auto [-webkit-app-region:no-drag]">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          aria-label="Date range"
          className="h-8 cursor-pointer appearance-none rounded-md border border-border bg-card px-3 pr-7 text-[13px] text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/40"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27 viewBox=%270 0 10 10%27%3E%3Cpath fill=%27none%27 stroke=%27%23737373%27 stroke-width=%271.5%27 d=%27M2 4l3 3 3-3%27/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.5rem center'
          }}
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
