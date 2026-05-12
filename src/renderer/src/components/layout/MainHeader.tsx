import { IconButton } from '@renderer/components/ui/IconButton'
import { useLayoutStore } from '@renderer/state/layoutStore'
import { usePaletteStore } from '@renderer/state/paletteStore'
import { useRangeStore } from '@renderer/state/rangeStore'
import { Command, PanelLeft, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RangePill } from './RangePill'

export interface Breadcrumb {
  label: string
  to?: string
}

interface MainHeaderProps {
  /** Title or breadcrumb path. A single string renders as the page title. */
  title: string | Breadcrumb[]
  /** Distance from window left to header content, in px — matches the content
   *  area's paddingLeft so the header and content align vertically. */
  leftPad: number
  /** Distance from window right to header content, in px — matches the
   *  content area's paddingRight. */
  rightPad: number
}

/**
 * Header strip for the main pane. Renders the page title (or breadcrumb
 * trail) on the left and the global RangePill on the right.
 *
 * When the sidebar is hidden, three IconButtons appear before the title:
 *   • PanelLeft — toggles the sidebar back open
 *   • Search    — opens the command palette in search mode
 *   • Command   — opens the command palette in command mode
 * These mirror what the sidebar's own header band exposes, so a user who
 * has hidden the sidebar still has the same actions one click away.
 */
export function MainHeader({ title, leftPad, rightPad }: MainHeaderProps): React.JSX.Element {
  const range = useRangeStore((s) => s.range)
  const setRange = useRangeStore((s) => s.setRange)
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const peekActive = useLayoutStore((s) => s.peekActive)
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)
  const openPalette = usePaletteStore((s) => s.openWith)
  // Only render the icon trio when the sidebar is fully out of the way
  // (not even peeking). During a peek the sidebar already exposes these
  // same actions, so the trio would be redundant.
  const showIcons = !sidebarOpen && !peekActive

  return (
    <div
      style={{ left: leftPad, right: rightPad }}
      className="absolute top-2 z-30 flex h-9 items-center gap-2 [-webkit-app-region:drag]"
    >
      {showIcons && (
        <div className="flex shrink-0 items-center gap-0.5 [-webkit-app-region:no-drag]">
          <IconButton
            onClick={toggleSidebar}
            aria-label="Show sidebar"
            title="Show sidebar (Cmd-B)"
          >
            <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          </IconButton>
          <IconButton
            onClick={() => openPalette('search')}
            aria-label="Search transcripts"
            title="Search transcripts (Cmd-P)"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={1.8} />
          </IconButton>
          <IconButton
            onClick={() => openPalette('command')}
            aria-label="Open command palette"
            title="Command palette (Cmd-K)"
          >
            <Command className="h-3.5 w-3.5" strokeWidth={1.8} />
          </IconButton>
        </div>
      )}
      {/* `no-drag` on the title so breadcrumb <Link> segments are clickable
          (the parent header is a drag region, which otherwise eats clicks
          and turns them into window drags). */}
      <div className="min-w-0 flex-1 [-webkit-app-region:no-drag]">
        <TitleNode title={title} />
      </div>
      <div className="flex shrink-0 items-center gap-1 [-webkit-app-region:no-drag]">
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
