import { PanelLeft, Search } from 'lucide-react'
import { useState } from 'react'
import { useLayoutStore } from '@renderer/state/layoutStore'

interface TopbarProps {
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
 * The horizontal bar beneath the titlebar.
 *
 * Page title sits left. When viewing /transcripts the search input is
 * absolutely centred. Date range select sits right.
 *
 * No divider underneath — the shell uses elevation, not lines.
 */
export function Topbar({ title, showSearch }: TopbarProps): React.JSX.Element {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen)
  const [range, setRange] = useState('90')
  const [search, setSearch] = useState('')

  return (
    <div className="relative flex h-12 shrink-0 items-center gap-2 px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Show sidebar"
            title="Show sidebar"
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <PanelLeft className="h-4 w-4" strokeWidth={1.8} />
          </button>
        )}
        <h1 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h1>
      </div>

      {showSearch && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
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

      <div className="ml-auto">
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
