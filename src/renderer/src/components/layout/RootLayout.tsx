import { formatTimestamp } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import { useLayoutStore } from '@renderer/state/layoutStore'
import { chartBreadcrumb } from '@renderer/screens/chartRegistry'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { CommandPalette } from '../command-palette/CommandPalette'
import { MainHeader, type Breadcrumb } from './MainHeader'
import { Sidebar } from './Sidebar'
import { Window } from './Window'

const SIDEBAR_GAP = 8
const CONTENT_GUTTER = 24
const HEADER_TOP = 8 // sidebar + header both at top-2
const HEADER_H = 36
const FRAME_GAP = 8 // matches sidebar's bottom-2 — content sits at 8px from the window bottom
// When the sidebar is hidden the macOS traffic lights (Electron-native at
// x=18 y=18, ~70px wide) sit on top of the main pane. Reserve the space
// so the navbar title and content don't collide with them.
const TRAFFIC_LIGHT_RESERVE = 88

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/transcripts': 'Transcripts',
  '/usage': 'Usage',
  '/language': 'Language',
  '/settings': 'Settings'
}

function titleFor(pathname: string): string {
  if (pathname.startsWith('/transcripts/')) return 'Transcripts'
  return TITLES[pathname] ?? 'SuperWhisper'
}

/**
 * Root of the app. Layers (z-order):
 *   • Window     — full-screen, --window backdrop
 *   • main       — fills the right-of-sidebar area; scroll happens here
 *   • Sidebar    — floats at top-2 left-2 bottom-2, hosts traffic lights and toggle
 *   • MainHeader — overlays the top of the main area; hosts breadcrumb + range
 *
 * The header and sidebar both start at top-2 and are 36px tall, so the
 * traffic lights (Electron-native at y=18) sit visually inside whichever
 * surface is to their right (sidebar when open, header when closed).
 */
export function RootLayout(): React.JSX.Element {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth)
  const location = useLocation()
  const [params] = useSearchParams()

  // When the sidebar is open it covers the traffic-light area; when it's
  // closed the navbar/content need to indent past the traffic lights so
  // the title doesn't collide with them.
  const leftPad = sidebarOpen
    ? sidebarWidth + SIDEBAR_GAP /* sidebar's own left-2 */ + SIDEBAR_GAP + CONTENT_GUTTER
    : Math.max(CONTENT_GUTTER, TRAFFIC_LIGHT_RESERVE)
  // /chart/:slug renders a breadcrumb instead of a plain title; backTo
  // points at the screen the chart was launched from when supplied.
  const chartMatch = location.pathname.match(/^\/chart\/([^/]+)/)
  const chartCrumb = chartMatch ? chartBreadcrumb(chartMatch[1]) : null
  // /transcripts/:id likewise produces a breadcrumb (Transcripts › <ts>)
  // and a Back arrow pointing at the list. Resolved here rather than in
  // the screen so the navbar is the single source of truth for titles.
  const transcriptMatch = location.pathname.match(/^\/transcripts\/([^/]+)/)
  const transcriptRec = transcriptMatch
    ? mock.recordings.find((r) => r.id === transcriptMatch[1])
    : undefined
  const fromParam = params.get('from')
  let backTo: string | undefined
  let title: string | Breadcrumb[]
  if (chartCrumb) {
    backTo = fromParam ? decodeURIComponent(fromParam) : chartCrumb.sectionPath
    title = [{ label: chartCrumb.section, to: chartCrumb.sectionPath }, { label: chartCrumb.title }]
  } else if (transcriptRec) {
    backTo = '/transcripts'
    title = [
      { label: 'Transcripts', to: '/transcripts' },
      { label: formatTimestamp(transcriptRec.datetime) }
    ]
  } else {
    title = titleFor(location.pathname)
  }

  return (
    <Window>
      <Sidebar />
      <MainHeader title={title} backTo={backTo} leftPad={leftPad} rightPad={CONTENT_GUTTER} />
      <main
        className="absolute inset-0 overflow-y-auto bg-background transition-[padding] duration-200 ease-out"
        style={{
          // Matches the floating frame: 8px window gap + header height +
          // 8px gap to content above; same 8px gap to window bottom.
          paddingTop: HEADER_TOP + HEADER_H + FRAME_GAP,
          paddingLeft: leftPad,
          paddingRight: CONTENT_GUTTER,
          paddingBottom: FRAME_GAP
        }}
      >
        <Outlet />
      </main>
      <CommandPalette />
    </Window>
  )
}
