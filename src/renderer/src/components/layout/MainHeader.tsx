import { IconButton } from '@renderer/components/ui/IconButton'
import { useHeaderStore } from '@renderer/state/headerStore'
import { useLayoutStore } from '@renderer/state/layoutStore'
import { useRangeStore } from '@renderer/state/rangeStore'
import { ChevronRight, PanelLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RangePill } from './RangePill'

export interface Breadcrumb {
  label: string
  to?: string
}

interface MainHeaderProps {
  /** Title or breadcrumb path. A single string renders as the page title. */
  title: string | Breadcrumb[]
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
  backTo,
  leftPad,
  rightPad
}: MainHeaderProps): React.JSX.Element {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)
  const headerActions = useHeaderStore((s) => s.actions)
  // Range lives in a global store so screens can react to it. The pill
  // here is just the read/write surface for the user.
  const range = useRangeStore((s) => s.range)
  const setRange = useRangeStore((s) => s.setRange)

  return (
    <div
      style={{ left: leftPad, right: rightPad }}
      className="absolute top-2 z-30 flex h-9 items-center gap-2 [-webkit-app-region:drag]"
    >
      {!sidebarOpen && (
        <IconButton onClick={toggleSidebar} aria-label="Show sidebar" title="Show sidebar">
          <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
        </IconButton>
      )}

      {backTo && (
        <IconButton asChild aria-label="Back" title="Back">
          <Link to={backTo}>
            <ChevronRight className="h-3.5 w-3.5 rotate-180" strokeWidth={1.8} />
          </Link>
        </IconButton>
      )}

      <TitleNode title={title} />

      {/* Spacer + screen-registered actions, then RangePill on the far right.
          Screens push their per-page IconButtons into the header via
          useHeaderActions(); the slot renders them just before the range. */}
      <div className="ml-auto flex items-center gap-1 [-webkit-app-region:no-drag]">
        {headerActions}
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
