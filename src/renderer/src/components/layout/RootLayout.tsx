import { WelcomeModal } from '@renderer/components/WelcomeModal'
import { useGlobalShortcut } from '@renderer/hooks/useGlobalShortcut'
import { formatTimestamp } from '@renderer/lib/format'
import { useConfigStore } from '@renderer/state/configStore'
import { useDataStore } from '@renderer/state/dataStore'
import { SIDEBAR_AUTO_HIDE_BELOW, useLayoutStore } from '@renderer/state/layoutStore'
import { chartBreadcrumb } from '@renderer/screens/chartRegistry'
import type { Recording } from '@shared/types'
import { Copy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CommandPalette } from '../command-palette/CommandPalette'
import { MainHeader, type Breadcrumb } from './MainHeader'
import { NavActionPill } from './NavActionPill'
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
 * Build the clipboard-ready transcript text. `rec.result` is the cleaned
 * server-side transcript (no timestamps) but we defensively strip any
 * `[m:ss]` style segment prefixes that some upstream tooling adds, and
 * normalise consecutive whitespace so the pasted output reads as a
 * single paragraph rather than the segmented block-view the UI shows.
 */
function transcriptForClipboard(rec: Recording): string {
  const source = rec.result || rec.segments.map((s) => s.text).join(' ')
  return source
    .replace(/\[\d+:\d{2}\]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function copyTranscript(rec: Recording): void {
  void navigator.clipboard.writeText(transcriptForClipboard(rec))
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
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen)
  const setPeek = useLayoutStore((s) => s.setPeek)
  const configHydrated = useConfigStore((s) => s.hydrated)
  const configValid = useConfigStore((s) => s.isValid)
  const demoMode = useConfigStore((s) => s.demoMode)
  const welcomeForceShow = useConfigStore((s) => s.welcomeForceShow)
  const autoHideSidebar = useConfigStore((s) => s.autoHideSidebar)
  const recordings = useDataStore((s) => s.recordings)
  const location = useLocation()

  // Auto-collapse the sidebar when the window narrows past the threshold.
  // Re-expand on widen is intentionally NOT wired — that'd cause flicker
  // for users who hand-resized to ~900px and toggled the sidebar manually.
  useEffect(() => {
    if (!autoHideSidebar) return undefined
    const apply = (): void => {
      if (window.innerWidth < SIDEBAR_AUTO_HIDE_BELOW) {
        if (useLayoutStore.getState().sidebarOpen) setSidebarOpen(false)
      }
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [autoHideSidebar, setSidebarOpen])

  // Two shortcuts for the same toggle: Cmd-B (familiar to ex-Notion / VS
  // Code users) and Cmd-Option-Left (matches the macOS pattern of
  // "modifier + arrow" for panel collapse). Both mounted at layout level
  // so they're live on every screen.
  useGlobalShortcut({ key: 'b', mod: true }, toggleSidebar)
  useGlobalShortcut({ key: 'ArrowLeft', mod: true, alt: true }, toggleSidebar)

  // Cmd-, matches the macOS convention for opening app preferences.
  // Pushes a /settings navigation regardless of the current route.
  const navigate = useNavigate()
  const openSettings = useCallback(() => {
    navigate('/settings')
  }, [navigate])
  useGlobalShortcut({ key: ',', mod: true }, openSettings)

  // When the sidebar is open it covers the traffic-light area; when it's
  // closed the navbar/content need to indent past the traffic lights so
  // the title doesn't collide with them.
  const leftPad = sidebarOpen
    ? sidebarWidth + SIDEBAR_GAP /* sidebar's own left-2 */ + SIDEBAR_GAP + CONTENT_GUTTER
    : Math.max(CONTENT_GUTTER, TRAFFIC_LIGHT_RESERVE)
  // Symmetric content gutter when the sidebar is collapsed — pad the right
  // edge the same amount as the left so the content area is visually
  // centred in the window, not pushed right by the traffic-light reserve.
  // When the sidebar is open we keep the smaller CONTENT_GUTTER on the
  // right so the content stretches naturally toward it.
  const rightPad = sidebarOpen ? CONTENT_GUTTER : leftPad
  // /chart/:slug renders a breadcrumb instead of a plain title; the
  // breadcrumb's <Link> segments are how the user navigates back.
  const chartMatch = location.pathname.match(/^\/chart\/([^/]+)/)
  const chartCrumb = chartMatch ? chartBreadcrumb(chartMatch[1]) : null
  // /transcripts/:id likewise produces a breadcrumb (Transcripts › <ts>).
  // Resolved here rather than in the screen so the navbar is the single
  // source of truth for titles.
  const transcriptMatch = location.pathname.match(/^\/transcripts\/([^/]+)/)
  const transcriptRec = transcriptMatch
    ? recordings.find((r) => r.id === transcriptMatch[1])
    : undefined
  let title: string | Breadcrumb[]
  if (chartCrumb) {
    title = [{ label: chartCrumb.section, to: chartCrumb.sectionPath }, { label: chartCrumb.title }]
  } else if (transcriptRec) {
    title = [
      { label: 'Transcripts', to: '/transcripts' },
      { label: formatTimestamp(transcriptRec.datetime) }
    ]
  } else {
    title = titleFor(location.pathname)
  }

  // Soft fade behind the navbar -- shown only while the main pane is
  // scrolled past the top. When the page is at scrollTop 0 the fade is
  // fully transparent so unscrolled content (the Overview KPI grid in
  // particular) doesn't pick up any darkening at its top edge. Once the
  // user scrolls, the fade animates to full opacity so content tucking
  // under the breadcrumb / range pills doesn't visually collide.
  const mainRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const el = mainRef.current
    if (!el) return undefined
    const update = (): void => setScrolled(el.scrollTop > 4)
    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
    // Re-bind when the route changes -- a fresh <Outlet /> children mount
    // is the natural scrollTop-resets-to-0 boundary; listening to location
    // here keeps the flag honest.
  }, [location.pathname])

  const maskHeight = HEADER_TOP + HEADER_H + FRAME_GAP + 16
  return (
    <Window>
      {/* Peek hit-zone — invisible 12px column on the window's left edge.
          When the sidebar is collapsed, hovering this strip flips peek
          on, which renders the sidebar at its open transform without
          flipping the persisted open flag. Pointerleave on the sidebar
          bounds clears it. */}
      {!sidebarOpen && (
        <div
          aria-hidden
          onPointerEnter={() => setPeek(true)}
          className="absolute bottom-0 left-0 top-0 z-30 w-3"
        />
      )}
      <Sidebar />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 z-20 transition-[left,opacity] duration-200 ease-out"
        style={{
          left: leftPad - CONTENT_GUTTER / 2,
          right: rightPad - CONTENT_GUTTER / 2,
          height: maskHeight,
          opacity: scrolled ? 1 : 0,
          background:
            'linear-gradient(to bottom, var(--background) 0%, var(--background) 55%, color-mix(in srgb, var(--background) 60%, transparent) 80%, transparent 100%)'
        }}
      />
      <MainHeader
        title={title}
        leftPad={leftPad}
        rightPad={rightPad}
        // Hide the date-range pill on routes where it'd be noise:
        //   • single-transcript page — only one recording in view, the
        //     filter has nothing to act on
        //   • settings — has its own segmented tab strip and there's no
        //     time-windowed content to filter
        // Every other route (including the maximised chart view) keeps
        // the pill.
        showRange={!transcriptRec && location.pathname !== '/settings'}
        // Single-transcript page swaps the range pill for a "Copy
        // transcript" action pill in the same slot. The action used to
        // live as an IconButton in the DetailsCard header; moving it
        // up here makes it more discoverable and gives the navbar's
        // top-right corner a deliberate action across every route.
        rightAction={
          transcriptRec ? (
            <NavActionPill
              icon={Copy}
              label="Copy transcript"
              ariaLabel="Copy transcript to clipboard"
              onClick={() => copyTranscript(transcriptRec)}
            />
          ) : undefined
        }
      />
      <main
        ref={mainRef}
        className="absolute inset-0 overflow-y-auto bg-background transition-[padding] duration-200 ease-out"
        style={{
          // Matches the floating frame: 8px window gap + header height +
          // 8px gap to content above; same 8px gap to window bottom.
          paddingTop: HEADER_TOP + HEADER_H + FRAME_GAP,
          paddingLeft: leftPad,
          paddingRight: rightPad,
          paddingBottom: FRAME_GAP
        }}
      >
        <Outlet />
      </main>
      <CommandPalette />
      {/* Welcome appears when:
           • the user has no valid recordings folder AND demo isn't on
             (the natural "fresh install" trigger), OR
           • the user just hit Reset app in Settings (welcomeForceShow)
             — guarantees the flow is re-entered even when the default
             SuperWhisper path is detected on disk. */}
      {configHydrated && ((!configValid && !demoMode) || welcomeForceShow) && <WelcomeModal />}
    </Window>
  )
}
