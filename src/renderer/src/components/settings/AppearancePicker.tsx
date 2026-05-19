import { cn } from '@renderer/lib/cn'
import { useThemeStore, type ThemePref } from '@renderer/state/themeStore'

/**
 * Three large preview tiles (Light / System / Dark).
 *
 * Each tile shows a faux window peeking up from below — the window's
 * bottom edge is clipped by the tile boundary so the eye reads "this is
 * what the top of the app looks like in this mode". Sidebar tint on
 * the left, content panel inset to the right; "System" uses a single
 * sidebar (light) with the content panel split light/dark down the
 * middle so it doesn't show two sidebars wedged side by side.
 *
 * Active state is monochrome (foreground border + ring) rather than
 * an accent colour — keeps the palette disciplined.
 */
export function AppearancePicker(): React.JSX.Element {
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)
  return (
    <div className="grid grid-cols-3 gap-3">
      <PreviewTile pref="light" active={pref === 'light'} onSelect={setPref} />
      <PreviewTile pref="system" active={pref === 'system'} onSelect={setPref} />
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
        'flex flex-col items-stretch overflow-hidden rounded-lg border bg-card text-left transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        active
          ? 'border-foreground ring-1 ring-foreground'
          : 'border-border hover:border-foreground/20'
      )}
    >
      <div className="relative h-[88px] overflow-hidden">
        <WindowMock pref={pref} />
      </div>
      <div className="border-t border-border px-3 py-2 text-[12.5px] font-medium text-foreground">
        {LABELS[pref]}
      </div>
    </button>
  )
}

const LIGHT = {
  outer: '#fafaf9',
  sidebar: '#ededeb',
  content: '#ffffff',
  border: 'rgba(0,0,0,0.10)',
  strong: '#1f1f1f',
  muted: '#bdbcb6'
}

const DARK = {
  outer: '#1c1c1c',
  sidebar: '#2a2a2a',
  content: '#222222',
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
 * Avoids the two-sidebars-side-by-side artefact that the previous
 * implementation produced.
 */
function SystemMock(): React.JSX.Element {
  return (
    <div
      className="absolute left-3 right-3 top-3 h-32 overflow-hidden rounded-xl border"
      style={{ background: LIGHT.sidebar, borderColor: LIGHT.border }}
    >
      {/* Content panel — inset right of the sidebar, split light/dark */}
      <div className="absolute bottom-1.5 left-[34%] right-1.5 top-1.5 overflow-hidden rounded-md">
        <div className="flex h-full">
          <div className="relative flex-1" style={{ background: LIGHT.content }}>
            <Lines palette={LIGHT} side="left" />
          </div>
          <div className="relative flex-1" style={{ background: DARK.content }}>
            <Lines palette={DARK} side="right" />
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
        className="absolute bottom-1.5 left-[34%] right-1.5 top-1.5 rounded-md"
        style={{ background: palette.content }}
      />
      <div
        className="absolute left-[37%] top-3 h-[3px] w-[28%] rounded-full"
        style={{ background: palette.strong, opacity: 0.85 }}
      />
      <div
        className="absolute left-[37%] top-6 h-[2px] w-[42%] rounded-full"
        style={{ background: palette.muted }}
      />
      <div
        className="absolute left-[37%] top-[34px] h-[2px] w-[36%] rounded-full"
        style={{ background: palette.muted }}
      />
    </>
  )
}

function Lines({
  palette,
  side
}: {
  palette: typeof LIGHT
  side: 'left' | 'right'
}): React.JSX.Element {
  // For the System split, lines sit inside each half of the content
  // panel. Different left-offsets so they don't visually align across
  // the divide (more believable as two separate render contexts).
  const x = side === 'left' ? 'left-2' : 'left-2'
  return (
    <>
      <div
        className={cn('absolute top-2 h-[3px] w-[60%] rounded-full', x)}
        style={{ background: palette.strong, opacity: 0.85 }}
      />
      <div
        className={cn('absolute top-5 h-[2px] w-[80%] rounded-full', x)}
        style={{ background: palette.muted }}
      />
      <div
        className={cn('absolute top-[30px] h-[2px] w-[68%] rounded-full', x)}
        style={{ background: palette.muted }}
      />
    </>
  )
}
