import { useLayoutStore } from '@renderer/state/layoutStore'
import { ChevronRight, PanelLeft, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RangePill } from './RangePill'

export interface Breadcrumb {
  label: string
  to?: string
}

interface MainHeaderProps {
  /** Title or breadcrumb path. A single string renders as the page title. */
  title: string | Breadcrumb[]
  /** Render the centred Transcripts search input. */
  showSearch?: boolean
  /** Render a back arrow at the left of the title (chart full-screen view). */
  backTo?: string
}

/**
 * Header strip for the main pane. Sits to the right of the sidebar with an
 * 8px gap. When the sidebar is hidden, expands to span the area minus
 * traffic-light room and shows the sidebar toggle inline at its left, so
 * traffic lights and toggle always travel together.
 */
export function MainHeader({
  title,
  showSearch = false,
  backTo
}: MainHeaderProps): React.JSX.Element {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth)
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)
  const [range, setRange] = useState('90')
  const [search, setSearch] = useState('')

  const left = sidebarOpen ? sidebarWidth + 16 : 8 // sidebar's left-2 + width + gap-2, or just left-2 outer
  // When the sidebar is hidden, reserve room for native traffic lights at x=18.
  const paddingLeft = sidebarOpen ? 12 : 76

  return (
    <div
      style={{ left, paddingLeft }}
      className="absolute right-2 top-2 z-30 flex h-9 items-center gap-2 pr-1 [-webkit-app-region:drag]"
    >
      {!sidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Show sidebar"
          title="Show sidebar"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground [-webkit-app-region:no-drag]"
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.8} />
        </button>
      )}

      {backTo && (
        <Link
          to={backTo}
          aria-label="Back"
          title="Back"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground [-webkit-app-region:no-drag]"
        >
          <ChevronRight className="h-4 w-4 rotate-180" strokeWidth={1.8} />
        </Link>
      )}

      <TitleNode title={title} />

      {showSearch && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [-webkit-app-region:no-drag]">
          <FlatSearch value={search} onChange={setSearch} />
        </div>
      )}

      <div className="ml-auto [-webkit-app-region:no-drag]">
        <RangePill value={range} onChange={setRange} />
      </div>
    </div>
  )
}

function TitleNode({ title }: { title: string | Breadcrumb[] }): React.JSX.Element {
  if (typeof title === 'string') {
    return (
      <h1 className="select-none truncate text-[14px] font-semibold tracking-tight text-foreground">
        {title}
      </h1>
    )
  }
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1 text-[14px] font-semibold tracking-tight"
    >
      {title.map((crumb, i) => {
        const isLast = i === title.length - 1
        const node =
          crumb.to && !isLast ? (
            <Link
              to={crumb.to}
              className="rounded text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          ) : (
            <span
              className={isLast ? 'truncate text-foreground' : 'truncate text-muted-foreground'}
            >
              {crumb.label}
            </span>
          )
        return (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {node}
            {!isLast && (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            )}
          </span>
        )
      })}
    </nav>
  )
}

function FlatSearch({
  value,
  onChange
}: {
  value: string
  onChange: (v: string) => void
}): React.JSX.Element {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.8}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search transcripts"
        className="h-7 w-[280px] rounded-md border border-border bg-transparent pl-7 pr-2 text-[13px] text-foreground placeholder:text-muted-foreground transition-colors hover:border-foreground/30 focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/30"
      />
    </div>
  )
}
