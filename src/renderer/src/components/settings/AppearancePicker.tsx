import { cn } from '@renderer/lib/cn'
import { useThemeStore, type ThemePref } from '@renderer/state/themeStore'

/**
 * Three preview tiles (System / Light / Dark — in that order).
 *
 * Each tile shows a faux window peeking up from below — the window's
 * bottom edge is clipped by the tile boundary so the eye reads "this is
 * what the top of the app looks like in this mode". Sidebar tint on
 * the left, content panel inset to the right; "System" uses a single
 * sidebar (light) with the content panel split light/dark down the
 * middle so it doesn't show two sidebars wedged side by side.
 *
 * Every tile sits on the same subtle grey wash as the path bar — gives
 * the row a consistent base. Selected state uses a soft dark-grey
 * border + matching ring rather than the previous accent-blue or pure
 * black, so the highlight reads as a tint, not an alert.
 */
export function AppearancePicker(): React.JSX.Element {
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)
  return (
    <div className="grid grid-cols-3 gap-3">
      <PreviewTile pref="system" active={pref === 'system'} onSelect={setPref} />
      <PreviewTile pref="light" active={pref === 'light'} onSelect={setPref} />
      <PreviewTile pref="dark" active={pref === 'dark'} onSelect={setPref} />
    </div>
  )
}

const LABELS: Record<ThemePref, string> = {
  light: 'Light',
  system: 'System',
  dark: 'Dark'
}

interface PreviewTileProps {
  pref: ThemePref
  active: boolean
  onSelect: (pref: ThemePref) => void
}

function PreviewTile({ pref, active, onSelect }: PreviewTileProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelect(pref)}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-stretch overflow-hidden rounded-lg border bg-foreground/[0.025] text-left transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        active
          ? 'border-foreground/40 ring-1 ring-foreground/40'
          : 'border-border hover:border-foreground/20'
      )}
    >
      <div className="relative h-[88px] overflow-hidden">
        <WindowMock pref={pref} />
      </div>
      <div className="border-t border-border bg-card px-3 py-2 text-[12.5px] font-medium text-foreground">
        {LABELS[pref]}
      </div>
    </button>
  )
}

// Sidebar holds ~17% of the window width — half of the previous 34%
// inset. Content panel takes the remaining 83%.
const SIDEBAR_INSET = '17%'

const LIGHT = {
  outer: '#fafaf9',
  sidebar: '#ededeb',
  // Content "white" softened from #ffffff towards the sidebar grey so
  // it doesn't punch against the muted tile background.
  content: '#f6f6f4',
  border: 'rgba(0,0,0,0.10)',
  strong: '#1f1f1f',
  muted: '#bdbcb6'
}

const DARK = {
  outer: '#1c1c1c',
  sidebar: '#2a2a2a',
  // Similarly toned: closer to the sidebar tint than the previous
  // #222222 so the panels read as one window rather than two slabs.
  content: '#1f1f1f',
  border: 'rgba(255,255,255,0.08)',
  strong: '#fafafa',
  muted: '#5d5d5b'
}

function WindowMock({ pref }: { pref: ThemePref }): React.JSX.Element {
  if (pref === 'system') return <SystemMock />
  const palette = pref === 'dark' ? DARK : LIGHT
  return (
    <div
      className="absolute left-3 right-3 top-3 h-32 overflow-hidden rounded-xl border"
      style={{ background: palette.sidebar, borderColor: palette.border }}
    >
      <ContentPanel palette={palette} />
    </div>
  )
}

/**
 * System tile: ONE window outline, ONE sidebar (light, on the left),
 * content panel inset to the right and split half-light / half-dark.
 */
function SystemMock(): React.JSX.Element {
  return (
    <div
      className="absolute left-3 right-3 top-3 h-32 overflow-hidden rounded-xl border"
      style={{ background: LIGHT.sidebar, borderColor: LIGHT.border }}
    >
      <div
        className="absolute bottom-1.5 right-1.5 top-1.5 overflow-hidden rounded-md"
        style={{ left: `calc(${SIDEBAR_INSET} + 6px)` }}
      >
        <div className="flex h-full">
          <div className="relative flex-1" style={{ background: LIGHT.content }}>
            <Lines palette={LIGHT} />
          </div>
          <div className="relative flex-1" style={{ background: DARK.content }}>
            <Lines palette={DARK} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ContentPanel({ palette }: { palette: typeof LIGHT }): React.JSX.Element {
  return (
    <>
      <div
        className="absolute bottom-1.5 right-1.5 top-1.5 rounded-md"
        style={{ left: `calc(${SIDEBAR_INSET} + 6px)`, background: palette.content }}
      />
      <div
        className="absolute top-3 h-[3px] w-[28%] rounded-full"
        style={{
          left: `calc(${SIDEBAR_INSET} + 14px)`,
          background: palette.strong,
          opacity: 0.85
        }}
      />
      <div
        className="absolute top-6 h-[2px] w-[42%] rounded-full"
        style={{ left: `calc(${SIDEBAR_INSET} + 14px)`, background: palette.muted }}
      />
      <div
        className="absolute top-[34px] h-[2px] w-[36%] rounded-full"
        style={{ left: `calc(${SIDEBAR_INSET} + 14px)`, background: palette.muted }}
      />
    </>
  )
}

function Lines({ palette }: { palette: typeof LIGHT }): React.JSX.Element {
  return (
    <>
      <div
        className="absolute left-2 top-2 h-[3px] w-[60%] rounded-full"
        style={{ background: palette.strong, opacity: 0.85 }}
      />
      <div
        className="absolute left-2 top-5 h-[2px] w-[80%] rounded-full"
        style={{ background: palette.muted }}
      />
      <div
        className="absolute left-2 top-[30px] h-[2px] w-[68%] rounded-full"
        style={{ background: palette.muted }}
      />
    </>
  )
}
