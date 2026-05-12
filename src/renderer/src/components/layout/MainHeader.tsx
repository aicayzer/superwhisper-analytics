import { IconButton } from '@renderer/components/ui/IconButton'
import { useConfigStore } from '@renderer/state/configStore'
import { useLayoutStore } from '@renderer/state/layoutStore'
import { useRangeStore } from '@renderer/state/rangeStore'
import { PanelLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DemoModeBadge } from './DemoModeBadge'
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
  /** Optional element rendered in the navbar's top-right slot in place of
   *  the range pill. Used by the transcript-detail route to surface a
   *  "Copy transcript" pill. Ignored when `showRange` is true. */
  rightAction?: React.ReactNode
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
  showRange = true,
  rightAction
}: MainHeaderProps): React.JSX.Element {
  const range = useRangeStore((s) => s.range)
  const setRange = useRangeStore((s) => s.setRange)
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const peekActive = useLayoutStore((s) => s.peekActive)
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)
  const setPeek = useLayoutStore((s) => s.setPeek)
  const demoMode = useConfigStore((s) => s.demoMode)
  // Render the navbar's own toggle only when the sidebar is fully out of
  // the way. While peeking the sidebar covers the same area and provides
  // its own toggle, so a navbar copy would be redundant.
  const showToggle = !sidebarOpen && !peekActive

  return (
    // Three-column grid: [1fr title][auto center][1fr right]. The two
    // outer fr columns balance around the centre so the demo-mode badge
    // sits truly centred between the sidebar's right edge and the
    // window's right edge, regardless of how long the breadcrumb is.
    // When the centre is empty (demo off) the layout still works — the
    // auto column collapses, the title and right slot pull naturally.
    <div
      style={{ left: leftPad, right: rightPad }}
      className="absolute top-2 z-30 grid h-9 grid-cols-[1fr_auto_1fr] items-center gap-2 [-webkit-app-region:drag]"
    >
      {/* `no-drag` on the title so breadcrumb <Link> segments are clickable
          (the parent header is a drag region, which otherwise eats clicks
          and turns them into window drags). */}
      <div className="flex min-w-0 items-center gap-2 [-webkit-app-region:no-drag]">
        {showToggle && (
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
        )}
        <div className="min-w-0">
          <TitleNode title={title} />
        </div>
      </div>
      {/* Centre slot — only the DemoModeBadge claims it today. Wrapped
          in a div so the empty case still occupies the grid track and
          the right slot doesn't shift when demo flips. */}
      <div className="flex items-center justify-center [-webkit-app-region:no-drag]">
        {demoMode && <DemoModeBadge />}
      </div>
      <div className="flex items-center justify-end gap-1 [-webkit-app-region:no-drag]">
        {showRange ? (
          <RangePill value={range} onChange={setRange} />
        ) : rightAction ? (
          rightAction
        ) : null}
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
