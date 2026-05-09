import { useLayoutStore } from '@renderer/state/layoutStore'
import { ChevronRight, PanelLeft, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RangePill } from './RangePill'
import { DEFAULT_RANGE, type RangeValue } from './rangeOptions'

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
  /** Distance from window left to header content, in px — matches the content
   *  area's paddingLeft so the header and content align vertically. */
  leftPad: number
  /** Distance from window right to header content, in px — matches the
   *  content area's paddingRight. */
  rightPad: number
}

/**
 * Header strip for the main pane. The header's left and right edges align
 * with the content area below — same gutter on both sides — so the page
 * title sits over the same column as the content. When the sidebar is
 * hidden the show-sidebar toggle still reserves a small slot at the left.
 */
export function MainHeader({
  title,
  showSearch = false,
  backTo,
  leftPad,
  rightPad
}: MainHeaderProps): React.JSX.Element {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)
  const [range, setRange] = useState<RangeValue>(DEFAULT_RANGE)
  const [search, setSearch] = useState('')

  return (
    <div
      style={{ left: leftPad, right: rightPad }}
      className="absolute top-2 z-30 flex h-9 items-center gap-2 [-webkit-app-region:drag]"
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
    // Plain page title — slightly darker grey than the muted token so it
    // reads as a label rather than secondary text.
    return (
      <h1 className="select-none truncate text-[13.5px] font-medium tracking-tight text-foreground/70">
        {title}
      </h1>
    )
  }
  // Drilled-in breadcrumb — overall lighter than a plain title, separated
  // by a forward slash. Last segment gets a touch more weight.
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-medium tracking-tight text-muted-foreground/70"
    >
      {title.map((crumb, i) => {
        const isLast = i === title.length - 1
        const node =
          crumb.to && !isLast ? (
            <Link to={crumb.to} className="rounded transition-colors hover:text-foreground/70">
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate text-muted-foreground">{crumb.label}</span>
          )
        return (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            {node}
            {!isLast && <span aria-hidden>/</span>}
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
