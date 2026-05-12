import { useConfigStore } from '@renderer/state/configStore'
import { Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Navbar centre-slot indicator visible whenever demo mode is on.
 *
 * Two clickable parts inside one orange pill:
 *
 *   ┌──────────────────────────────────┐
 *   │ ✨ Demo mode │   Set folder       │     ← no valid folder
 *   └──────────────────────────────────┘
 *   ┌──────────────────────────────────┐
 *   │ ✨ Demo mode │   Exit             │     ← valid folder set
 *   └──────────────────────────────────┘
 *
 * Left part = persistent state label. Click → Settings → General (the
 * full management surface).
 *
 * Right part = the contextual action. Lighter background pill-within-
 * pill so it visually reads as a button:
 *   • No valid folder → "Set folder" — opens the native picker
 *     directly. On a successful pick, the path is persisted and demo
 *     mode is auto-disabled (path-first ordering avoids a welcome-
 *     modal flash).
 *   • Valid folder set → "Exit" — flips `demoMode` off in one click;
 *     real data resumes immediately. Useful when the user toggled
 *     demo on for screenshots / curiosity.
 *
 * Renders nothing when demo mode is off; the centre grid track of
 * MainHeader collapses cleanly.
 */
export function DemoModeBadge(): React.JSX.Element {
  const navigate = useNavigate()
  const isValid = useConfigStore((s) => s.isValid)
  const setPath = useConfigStore((s) => s.setPath)
  const setDemoMode = useConfigStore((s) => s.setDemoMode)

  async function pickFolder(): Promise<void> {
    const chosen = await window.api.dialog.pickFolder()
    if (!chosen) return
    // Same path-first ordering as Settings → Recordings folder card,
    // so the welcome trigger doesn't fire on the in-between state.
    await setPath(chosen)
    if (useConfigStore.getState().demoMode) await setDemoMode(false)
  }

  async function exitDemo(): Promise<void> {
    await setDemoMode(false)
  }

  const actionLabel = isValid ? 'Exit' : 'Set folder'
  const actionHandler = isValid ? exitDemo : pickFolder

  return (
    <div
      className="inline-flex h-6 shrink-0 items-stretch overflow-hidden rounded-full border border-accent-orange/30 bg-accent-orange/10 text-[11px] font-medium text-accent-orange [-webkit-app-region:no-drag]"
      role="group"
      aria-label="Demo mode controls"
    >
      <button
        type="button"
        onClick={() => navigate('/settings')}
        title="Demo mode is on — open Settings to manage"
        aria-label="Open Settings to manage demo mode"
        className="inline-flex items-center gap-1.5 pl-2.5 pr-2 transition-colors hover:bg-accent-orange/10 focus-visible:outline-none focus-visible:bg-accent-orange/15"
      >
        <Sparkles className="h-3 w-3" strokeWidth={2} />
        <span>Demo mode</span>
      </button>
      {/* Inner action chip. Slightly lifted (background, not transparent)
          so it reads as a button-within-button. Borderless on the left so
          it merges into the outer pill's right edge. */}
      <button
        type="button"
        onClick={() => void actionHandler()}
        title={isValid ? 'Exit demo mode' : 'Pick your SuperWhisper folder'}
        aria-label={isValid ? 'Exit demo mode' : 'Pick a recordings folder'}
        // The inner chip's bg uses `--background` which inverts cleanly
        // between light and dark mode. Inset by 2px top/bottom so the
        // chip looks like it sits inside the outer pill.
        className="my-[2px] mr-[2px] inline-flex items-center gap-1 rounded-full bg-background px-2 transition-colors hover:bg-accent-orange/[0.06] focus-visible:outline-none focus-visible:bg-accent-orange/[0.06]"
      >
        <span>{actionLabel}</span>
      </button>
    </div>
  )
}
