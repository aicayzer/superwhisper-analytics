import { cn } from '@renderer/lib/cn'
import { middleTruncate } from '@renderer/lib/format'
import { useConfigStore } from '@renderer/state/configStore'
import { Activity, BarChart3, BookOpen, ChevronRight, Clock, FolderSearch } from 'lucide-react'
import { useState } from 'react'

/**
 * Two-step welcome flow. Shown when the renderer has hydrated and the
 * configured recordings folder is missing or invalid AND the user has
 * not opted into demo mode. Demo data renders behind the modal so the
 * underlying screens look populated (see main/cache.ts demo fallback).
 *
 *   Step 1 — Welcome. Compact onboarding: BarChart3 icon, heading,
 *   subtitle, three icon-square bullets. Footer: "Start with demo
 *   data" link bottom-left, "Choose folder" solid primary button
 *   bottom-right.
 *
 *   Step 2 — Folder. Two stacked option cards: "Default location"
 *   (with Recommended badge when detected) and "Choose another
 *   folder". Clicking the custom card opens the native picker.
 *   Footer: "← Back" / "Done".
 *
 * Width 400px. Both step bodies share min-h-[280px] so the modal
 * shell stays the same height across steps. Modal can't be dismissed
 * by clicking the backdrop — only by completing a flow or choosing
 * demo. Colour discipline: blue is reserved for the icon square +
 * the small Recommended badge (identity / status). Primary actions
 * use solid foreground; selected option card uses foreground tint.
 */

type Step = 'welcome' | 'folder'
type FolderChoice = 'default' | 'custom'

// Each bullet is rendered as **<bold lead>** — <muted detail>.
const BULLETS: Array<{ lead: string; detail: string; icon: typeof Clock }> = [
  {
    icon: Clock,
    lead: 'See how often you record',
    detail: 'when, where in your week, and how it has changed over time.'
  },
  {
    icon: Activity,
    lead: 'Spot trends in your usage',
    detail: 'speaking pace, filler-word rate, vocabulary growth.'
  },
  {
    icon: BookOpen,
    lead: 'Browse every transcript',
    detail: 'with audio playback and a clickable segment view.'
  }
]

/** Solid foreground primary — black in light mode, near-white in dark.
 *  Reserves the strongest visual weight on the modal for the primary
 *  forward-action without using blue (which is reserved for the icon
 *  square + Recommended badge — identity / micro-status). */
const PRIMARY_BUTTON =
  'inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-foreground px-3 text-[11.5px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50'

const LINK_BUTTON =
  'text-[11.5px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground disabled:cursor-not-allowed disabled:opacity-50'

/** Fixed modal shell height. Both step bodies render inside a
 *  `flex-1` div, so the actual shell never jumps as the user moves
 *  between steps — regardless of how much content each step has. */
const SHELL_HEIGHT = 392

export function WelcomeModal(): React.JSX.Element {
  const setPath = useConfigStore((s) => s.setPath)
  const setDemoMode = useConfigStore((s) => s.setDemoMode)
  const defaultPath = useConfigStore((s) => s.defaultPath)
  const dismissWelcomeForce = useConfigStore((s) => s.dismissWelcomeForce)

  const [step, setStep] = useState<Step>('welcome')
  // Selection model for step 2. When no defaultPath was detected we
  // auto-select 'custom' so the user is one click away from the picker;
  // the disabled default card stays visible for context ("we looked
  // here, didn't find anything").
  const [choice, setChoice] = useState<FolderChoice>(defaultPath ? 'default' : 'custom')
  const [customPath, setCustomPath] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolvedPath = choice === 'default' ? defaultPath : customPath

  async function pickCustom(): Promise<void> {
    setPicking(true)
    setError(null)
    try {
      const chosen = await window.api.dialog.pickFolder()
      if (chosen) {
        setCustomPath(chosen)
        setChoice('custom')
      }
    } finally {
      setPicking(false)
    }
  }

  async function done(): Promise<void> {
    if (!resolvedPath) return
    setBusy(true)
    setError(null)
    try {
      // Real folder wins over any previously-set demo flag — if the
      // user has been browsing with demo on and is now wiring real
      // data, flip demo off so the path-driven scan takes over.
      // Order matters: persist the path first, then disable demo, so
      // the renderer never sees the (!demoMode && !path) in-between
      // state that would briefly fire the welcome trigger.
      await setPath(resolvedPath)
      if (useConfigStore.getState().demoMode) await setDemoMode(false)
      const stillInvalid = !useConfigStore.getState().isValid
      if (stillInvalid) {
        setError(
          "That folder doesn't look like a SuperWhisper recordings folder. Pick the directory that contains your recording subfolders."
        )
      } else {
        // Path stuck. Clear the reset-triggered force flag so the
        // modal disappears even when configValid would have hidden
        // it anyway.
        dismissWelcomeForce()
      }
    } finally {
      setBusy(false)
    }
  }

  async function startWithDemo(): Promise<void> {
    setBusy(true)
    try {
      await setDemoMode(true)
      dismissWelcomeForce()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 backdrop-blur-sm"
      // The window above is a drag region — the modal needs to opt out
      // so clicks inside it don't move the window.
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div
        style={{ height: SHELL_HEIGHT }}
        className="mx-4 flex w-full max-w-[400px] flex-col overflow-hidden rounded-xl border border-border bg-floating shadow-[var(--shadow-float)]"
      >
        {step === 'welcome' ? (
          <>
            <WelcomeStep />
            <Footer
              left={
                <button
                  type="button"
                  onClick={() => void startWithDemo()}
                  disabled={busy}
                  className={LINK_BUTTON}
                >
                  Start with demo data
                </button>
              }
              right={
                <button
                  type="button"
                  onClick={() => setStep('folder')}
                  disabled={busy}
                  className={PRIMARY_BUTTON}
                >
                  Choose folder
                </button>
              }
            />
          </>
        ) : (
          <>
            <FolderStep
              defaultPath={defaultPath}
              customPath={customPath}
              choice={choice}
              picking={picking}
              error={error}
              onSelectDefault={() => {
                if (defaultPath) setChoice('default')
              }}
              onSelectCustom={() => void pickCustom()}
            />
            <Footer
              left={
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setStep('welcome')
                  }}
                  disabled={busy}
                  className={LINK_BUTTON}
                >
                  ← Back
                </button>
              }
              right={
                <button
                  type="button"
                  onClick={() => void done()}
                  disabled={busy || !resolvedPath}
                  className={PRIMARY_BUTTON}
                >
                  {busy ? 'Loading…' : 'Get started'}
                </button>
              }
            />
          </>
        )}
      </div>
    </div>
  )
}

function WelcomeStep(): React.JSX.Element {
  return (
    <div className="flex-1 px-6 pt-6 pb-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-accent-blue-bg text-accent-blue">
        <BarChart3 className="h-5 w-5" strokeWidth={1.6} />
      </div>
      <h1 id="welcome-title" className="text-[17px] font-semibold leading-tight text-foreground">
        Welcome to SuperWhisper Analytics
      </h1>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
        An unofficial local app for browsing your SuperWhisper recording history.
      </p>
      <ul className="mt-4 space-y-2.5">
        {BULLETS.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground">
              <b.icon className="h-3 w-3" strokeWidth={1.8} />
            </span>
            <span className="text-[12.5px] leading-relaxed text-foreground/90">
              <span className="font-semibold text-foreground">{b.lead}</span>
              <span className="text-muted-foreground"> — {b.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FolderStep({
  defaultPath,
  customPath,
  choice,
  picking,
  error,
  onSelectDefault,
  onSelectCustom
}: {
  defaultPath: string | null
  customPath: string | null
  choice: FolderChoice
  picking: boolean
  error: string | null
  onSelectDefault: () => void
  onSelectCustom: () => void
}): React.JSX.Element {
  const defaultMissing = !defaultPath
  return (
    <div className="flex-1 px-6 pt-6 pb-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-accent-blue-bg text-accent-blue">
        <FolderSearch className="h-5 w-5" strokeWidth={1.6} />
      </div>
      <h1 className="text-[17px] font-semibold leading-tight text-foreground">
        Where are your recordings?
      </h1>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
        Use the default unless your recordings are in a custom location.
      </p>

      <div className="mt-4 space-y-2">
        <OptionCard
          selected={!defaultMissing && choice === 'default'}
          disabled={defaultMissing}
          onClick={onSelectDefault}
          title="Default location"
          badge={defaultMissing ? undefined : 'Recommended'}
          detail={defaultMissing ? 'Not found on this Mac' : middleTruncate(defaultPath ?? '', 44)}
          detailTone={defaultMissing ? 'warn' : 'muted'}
          // Mono only for the actual path; the "Not found" copy reads as
          // prose, not a filesystem string.
          detailMono={!defaultMissing}
        />
        <OptionCard
          selected={choice === 'custom'}
          onClick={onSelectCustom}
          title="Choose another folder"
          detail={
            picking
              ? 'Opening picker…'
              : customPath
                ? middleTruncate(customPath, 44)
                : 'Pick a folder anywhere on your Mac'
          }
          // Mono only when we're displaying an actual chosen path. The
          // placeholder + "Opening picker…" are prose.
          detailMono={!!customPath}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-200/60 bg-red-50 px-3 py-2 text-[12px] leading-snug text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}

function OptionCard({
  selected,
  disabled,
  onClick,
  title,
  badge,
  detail,
  detailTone = 'muted',
  detailMono = false
}: {
  selected: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  badge?: string
  detail: string
  detailTone?: 'muted' | 'warn'
  detailMono?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-lg border px-3.5 py-3 text-left transition-colors',
        selected
          ? 'border-foreground/40 bg-foreground/[0.04]'
          : 'border-border bg-card hover:bg-foreground/[0.03]',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-card'
      )}
    >
      <div
        className={cn(
          'mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
          selected ? 'border-foreground bg-foreground' : 'border-muted-foreground/40'
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-semibold text-foreground">{title}</span>
          {badge && (
            <span className="rounded-full bg-accent-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-blue">
              {badge}
            </span>
          )}
        </div>
        <div
          className={cn(
            'mt-0.5 truncate text-[11.5px]',
            detailMono && 'font-mono text-[11px]',
            detailTone === 'warn' ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'
          )}
        >
          {detail}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" strokeWidth={1.8} />
    </button>
  )
}

function Footer({
  left,
  right
}: {
  left: React.ReactNode
  right: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-3">
      {left}
      {right}
    </div>
  )
}
