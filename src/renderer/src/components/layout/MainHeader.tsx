import { useRangeStore } from '@renderer/state/rangeStore'
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
 * Header strip for the main pane. Only renders the page title (or breadcrumb
 * trail) on the left and the global RangePill on the right.
 *
 * Previously this hosted a sidebar toggle, back arrow, and a per-screen
 * actions slot. Those were removed in PR #15:
 *   • Sidebar toggle  → Cmd-B (registered in RootLayout). The sidebar's own
 *                       internal close button handles the open→closed flip.
 *   • Back arrow      → redundant with the breadcrumb's <Link> segments.
 *   • Header actions  → screens now own their action chrome (Copy lives in
 *                       the DetailsCard header, ColumnsMenu lives in the
 *                       transcripts-table toolbar, view-mode is in Settings).
 */
export function MainHeader({ title, leftPad, rightPad }: MainHeaderProps): React.JSX.Element {
  const range = useRangeStore((s) => s.range)
  const setRange = useRangeStore((s) => s.setRange)

  return (
    <div
      style={{ left: leftPad, right: rightPad }}
      className="absolute top-2 z-30 flex h-9 items-center gap-2 [-webkit-app-region:drag]"
    >
      <TitleNode title={title} />
      <div className="ml-auto flex items-center gap-1 [-webkit-app-region:no-drag]">
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
