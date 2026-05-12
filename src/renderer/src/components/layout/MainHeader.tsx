import { IconButton } from '@renderer/components/ui/IconButton'
import { useLayoutStore } from '@renderer/state/layoutStore'
import { useRangeStore } from '@renderer/state/rangeStore'
import { PanelLeft } from 'lucide-react'
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
  /** Show the date-range pill on the right side of the header. False on
   *  routes where the pill would be meaningless (e.g. an individual
   *  transcript). Default true. */
  showRange?: boolean
}

/**
 * Header strip for the main pane. Renders the page title (or breadcrumb
 * trail) on the left and the global RangePill on the right.
 *
 * When the sidebar is hidden, a single PanelLeft IconButton appears
 * before the title to flip the sidebar back open. Hovering that button
 * peeks the sidebar in without committing to opening it — moving the
 * pointer away retracts it; clicking inside the peeked sidebar promotes
 * the peek into the locked-open state. Search + Command icons are kept
 * inside the sidebar itself (visible when it's open or peeked), so we
 * don't duplicate them here.
 */
export function MainHeader({
  title,
  leftPad,
  rightPad,
  showRange = true
}: MainHeaderProps): React.JSX.Element {
  const range = useRangeStore((s) => s.range)
  const setRange = useRangeStore((s) => s.setRange)
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const peekActive = useLayoutStore((s) => s.peekActive)
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)
  const setPeek = useLayoutStore((s) => s.setPeek)
  // Render the navbar's own toggle only when the sidebar is fully out of
  // the way. While peeking the sidebar covers the same area and provides
  // its own toggle, so a navbar copy would be redundant.
  const showToggle = !sidebarOpen && !peekActive

  return (
    <div
      style={{ left: leftPad, right: rightPad }}
      className="absolute top-2 z-30 flex h-9 items-center gap-2 [-webkit-app-region:drag]"
    >
      {showToggle && (
        <div className="flex shrink-0 items-center [-webkit-app-region:no-drag]">
          <IconButton
            onClick={toggleSidebar}
            // Hovering the toggle peeks the sidebar — the user can use
            // the sidebar's nav without committing to opening it. Move
            // away to retract; click inside the sidebar to lock it open.
            onPointerEnter={() => setPeek(true)}
            aria-label="Show sidebar"
            title="Show sidebar (Cmd-B)"
          >
            <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          </IconButton>
        </div>
      )}
      {/* `no-drag` on the title so breadcrumb <Link> segments are clickable
          (the parent header is a drag region, which otherwise eats clicks
          and turns them into window drags). */}
      <div className="min-w-0 flex-1 [-webkit-app-region:no-drag]">
        <TitleNode title={title} />
      </div>
      {showRange && (
        <div className="flex shrink-0 items-center gap-1 [-webkit-app-region:no-drag]">
          <RangePill value={range} onChange={setRange} />
        </div>
      )}
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
